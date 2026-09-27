'use client'

import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { callUi, fillCall } from '@/lib/i18n/call-ui'
import { localeForSpeech } from '@/lib/call-locale'
import { RealtimeTranslator } from '@/lib/realtime-translate'
import { createPhonePeer, postCall, readCall, sleep, waitForIceGathering } from '@/lib/phone-bridge'

export default function PhoneCall({
  locale,
  hostLanguage,
  guestLanguage,
  youLabel,
  otherLabel,
  youLanguage,
  otherLanguage,
  onClose,
}: {
  locale: Locale
  hostLanguage: string
  guestLanguage: string
  youLabel: string
  otherLabel: string
  youLanguage: string
  otherLanguage: string
  onClose: () => void
}) {
  const copy = callUi[locale]
  const guestCopy = callUi[localeForSpeech(guestLanguage)]
  const [link, setLink] = useState('')
  const [status, setStatus] = useState<'waiting' | 'live' | 'error'>('waiting')
  const [copied, setCopied] = useState(false)
  const message = link ? fillCall(guestCopy.shareBody, { youLanguage, otherLanguage, link }) : ''
  const closed = useRef(false)

  useEffect(() => {
    const audio = new Audio()
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')
    const translator = new RealtimeTranslator()
    let peer: RTCPeerConnection | null = null
    let roomId = ''
    let hostToken = ''
    closed.current = false

    const finish = () => {
      if (closed.current) return
      closed.current = true
      peer?.close()
      translator.disconnect()
      audio.srcObject = null
      if (roomId && hostToken) void postCall(roomId, hostToken, 'end').catch(() => undefined)
    }

    const run = async () => {
      const created = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostLanguage, guestLanguage }),
      })
      const room = await created.json().catch(() => ({}))
      if (!created.ok || typeof room.id !== 'string' || typeof room.hostToken !== 'string' || typeof room.guestToken !== 'string') {
        if (!closed.current) setStatus('error')
        return
      }
      roomId = room.id
      hostToken = room.hostToken
      const guestLink = `${window.location.origin}/call/${room.id}?t=${encodeURIComponent(room.guestToken)}`
      if (closed.current) return
      setLink(guestLink)

      let offered = false
      let publishing = false
      while (!closed.current) {
        const state = await readCall(roomId, hostToken)
        if (state.ended) return
        if (state.guestReady && !offered) {
          offered = true
          await translator.connect({
            sourceLanguage: hostLanguage,
            targetLanguage: guestLanguage,
            forwardTranslation: true,
            onTranslatedTrack: (track) => {
              if (publishing || closed.current) return
              publishing = true
              peer = createPhonePeer(audio)
              peer.addTrack(track)
              void (async () => {
                if (!peer) return
                const offer = await peer.createOffer()
                await peer.setLocalDescription(offer)
                await waitForIceGathering(peer)
                if (closed.current || !peer.localDescription?.sdp) return
                await postCall(roomId, hostToken, 'offer', peer.localDescription.sdp)
              })().catch(() => {
                if (!closed.current) setStatus('error')
              })
            },
          })
        }
        if (peer && state.answer && !peer.remoteDescription) {
          await peer.setRemoteDescription({ type: 'answer', sdp: state.answer })
          if (!closed.current) setStatus('live')
        }
        await sleep(800)
      }
    }

    void run().catch(() => {
      if (!closed.current) setStatus('error')
    })

    return finish
  }, [guestLanguage, hostLanguage])

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-5 rounded-3xl border-2 border-primary-700 bg-white p-4 shadow-md sm:p-5" lang={locale}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{copy.kicker}</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">{copy.title}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {copy.close}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">{copy.previewNote}</p>
      <p className="mt-3 text-sm font-semibold text-slate-800">
        {youLabel}: {youLanguage} · {otherLabel}: {otherLanguage}
      </p>
      {message && (
        <>
          <p className="mt-3 text-sm font-semibold text-slate-700">{copy.shareLead}</p>
          <p className="mt-2 whitespace-pre-wrap break-all rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-800 ring-1 ring-slate-200" dir={localeForSpeech(guestLanguage) === 'ar' ? 'rtl' : 'ltr'} lang={localeForSpeech(guestLanguage)}>
            {message}
          </p>
          <button type="button" onClick={() => void copyMessage()} className="mt-3 rounded-full bg-primary-700 px-4 py-2 text-sm font-bold text-white">
            {copied ? copy.copied : copy.copyMessage}
          </button>
        </>
      )}
      <p className={`mt-4 flex items-center gap-2 text-sm font-semibold ${status === 'live' ? 'text-teal-800' : 'text-amber-900'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${status === 'live' ? 'animate-pulse bg-teal-500' : 'bg-amber-400'}`} aria-hidden />
        {status === 'live' ? copy.connected : status === 'error' ? copy.failed : copy.waiting}
      </p>
      <button type="button" onClick={onClose} className="mt-4 rounded-full border border-primary-300 px-4 py-2 text-sm font-bold text-primary-900">
        {copy.hangUp}
      </button>
    </section>
  )
}
