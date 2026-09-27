'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { callUi, fillCall } from '@/lib/i18n/call-ui'
import { localeForSpeech } from '@/lib/call-locale'
import { findTranslatorLanguage, RealtimeTranslator } from '@/lib/realtime-translate'
import { createPhonePeer, postCall, readCall, sleep, waitForIceGathering, type CallSnapshot } from '@/lib/phone-bridge'

export default function GuestCall({ roomId }: { roomId: string }) {
  const params = useSearchParams()
  const token = params.get('t') || ''
  const [room, setRoom] = useState<CallSnapshot | null>(null)
  const [missing, setMissing] = useState(false)
  const [joined, setJoined] = useState(false)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!token) {
      setMissing(true)
      return
    }
    let stop = false
    void readCall(roomId, token)
      .then((state) => {
        if (!stop) setRoom(state)
      })
      .catch(() => {
        if (!stop) setMissing(true)
      })
    return () => {
      stop = true
    }
  }, [roomId, token])

  const locale = localeForSpeech(room?.guestLanguage || 'en')
  const copy = callUi[locale]
  const hostName = findTranslatorLanguage(room?.hostLanguage || '')?.label || room?.hostLanguage || ''
  const guestName = findTranslatorLanguage(room?.guestLanguage || '')?.label || room?.guestLanguage || ''

  const join = () => {
    if (!room || joined) return
    setJoined(true)
    const audio = new Audio()
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')
    void audio.play().catch(() => undefined)
    const translator = new RealtimeTranslator()
    let peer: RTCPeerConnection | null = null
    let track: MediaStreamTrack | null = null
    let answered = false
    let stop = false

    const answer = async (offer: string) => {
      if (answered || !track || !offer) return
      answered = true
      peer = createPhonePeer(audio)
      await peer.setRemoteDescription({ type: 'offer', sdp: offer })
      peer.addTrack(track)
      const reply = await peer.createAnswer()
      await peer.setLocalDescription(reply)
      await waitForIceGathering(peer)
      if (stop || !peer.localDescription?.sdp) return
      await postCall(roomId, token, 'answer', peer.localDescription.sdp)
      setLive(true)
    }

    void (async () => {
      await postCall(roomId, token, 'ready')
      await translator.connect({
        sourceLanguage: room.guestLanguage,
        targetLanguage: room.hostLanguage,
        callToken: token,
        forwardTranslation: true,
        onTranslatedTrack: (next) => {
          track = next
        },
      })
      while (!stop) {
        const state = await readCall(roomId, token)
        if (state.ended) return
        if (state.offer) await answer(state.offer)
        await sleep(800)
      }
    })().catch(() => setFailed(true))

    window.addEventListener(
      'pagehide',
      () => {
        stop = true
        peer?.close()
        translator.disconnect()
        void postCall(roomId, token, 'end').catch(() => undefined)
      },
      { once: true }
    )
  }

  if (missing) {
    return <main className="mx-auto max-w-lg px-4 py-10 text-slate-800">{copy.failed}</main>
  }
  if (!room) {
    return <main className="mx-auto max-w-lg px-4 py-10 text-slate-500">…</main>
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8" dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
      <p className="text-sm font-semibold text-primary-800">{copy.incoming}</p>
      <h1 className="mt-2 text-3xl font-black text-slate-900">{copy.joinTitle}</h1>
      <p className="mt-4 rounded-2xl bg-primary-50 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-800">
        {fillCall(copy.guestBrief, {})}
      </p>
      <p className="mt-4 text-base text-slate-800">
        {copy.youSpeak}: <span className="font-bold">{guestName}</span>
      </p>
      <p className="mt-1 text-base text-slate-800">
        {copy.youHear}: <span className="font-bold">{hostName}</span>
      </p>
      {live ? (
        <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-teal-800">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-teal-500" aria-hidden />
          {copy.connected}
        </p>
      ) : (
        <button
          type="button"
          onClick={join}
          disabled={joined}
          className="mt-5 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {copy.join}
        </button>
      )}
      {failed && <p className="mt-3 text-sm font-semibold text-red-700">{copy.failed}</p>}
    </main>
  )
}
