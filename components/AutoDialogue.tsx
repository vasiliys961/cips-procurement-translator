'use client'

import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { translatorUi } from '@/lib/i18n/translator-ui'
import { DialogueMicrophone } from '@/lib/auto-dialogue-capture'
import { TRANSLATOR_LANGUAGES, type ProcurementFidelityReport } from '@/lib/realtime-translate'
import { fidelityDisplayLines, fidelityLineText } from '@/lib/procurement-translate/fidelity-notice'

type Phase = 'ready' | 'connecting' | 'listening' | 'speaking' | 'processing' | 'playing' | 'blocked' | 'error'
type Turn = { source: string; translation: string; language: string; target: string; fidelity: ProcurementFidelityReport }

export default function AutoDialogue({ locale, onActiveChange }: { locale: Locale; onActiveChange: (active: boolean) => void }) {
  const ru = locale === 'ru'
  const copy = translatorUi[locale]
  const [first, setFirst] = useState('ru')
  const [second, setSecond] = useState('en')
  const [phase, setPhase] = useState<Phase>('ready')
  const [notice, setNotice] = useState('')
  const [turns, setTurns] = useState<Turn[]>([])
  const mic = useRef<DialogueMicrophone | null>(null)
  const epoch = useRef(0)
  const abort = useRef<AbortController | null>(null)
  const output = useRef<AudioContext | null>(null)
  const source = useRef<AudioBufferSourceNode | null>(null)
  const pending = useRef<AudioBuffer | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const active = !['ready', 'error'].includes(phase)
  const label = (code: string) => TRANSLATOR_LANGUAGES.find(item => item.code === code)?.label ?? code

  const cleanup = () => {
    epoch.current++
    abort.current?.abort()
    abort.current = null
    mic.current?.stop()
    mic.current = null
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (source.current) { source.current.onended = null; source.current.stop(); source.current = null }
    pending.current = null
    void output.current?.close().catch(() => undefined)
    output.current = null
  }
  useEffect(() => { onActiveChange(active) }, [active, onActiveChange])
  useEffect(() => () => cleanup(), [])
  useEffect(() => {
    const stop = () => { cleanup(); setPhase('ready') }
    // Backgrounding a mobile page must release its microphone and pending reply.
    const visibility = () => { if (document.hidden) stop() }
    window.addEventListener('pagehide', stop)
    document.addEventListener('visibilitychange', visibility)
    return () => { window.removeEventListener('pagehide', stop); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  const listenAgain = (id: number) => {
    timer.current = setTimeout(() => {
      if (id !== epoch.current) return
      mic.current?.resume()
      setPhase('listening')
    }, 350)
  }
  const play = async (id: number) => {
    const context = output.current
    const buffer = pending.current
    if (!context || !buffer || id !== epoch.current) return
    try {
      await context.resume()
      if (id !== epoch.current) return
      if (context.state !== 'running') { setPhase('blocked'); return }
      const node = context.createBufferSource()
      node.buffer = buffer
      node.connect(context.destination)
      source.current = node
      node.onended = () => {
        if (id !== epoch.current) return
        source.current = null
        pending.current = null
        listenAgain(id)
      }
      node.start()
      setPhase('playing')
    } catch {
      if (id === epoch.current) setPhase('blocked')
    }
  }

  const start = async () => {
    cleanup()
    const id = epoch.current
    setNotice('')
    setTurns([])
    setPhase('connecting')
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext || !window.AudioWorkletNode) {
      setNotice(ru ? 'Для автодиалога нужен браузер с AudioWorklet и доступом к микрофону через HTTPS.' : 'Auto dialogue requires AudioWorklet and microphone access over HTTPS.')
      setPhase('error')
      return
    }
    const context = new AudioContext()
    output.current = context
    void context.resume().catch(() => undefined)
    const microphone = new DialogueMicrophone()
    mic.current = microphone
    const fail = () => {
      if (id !== epoch.current) return
      cleanup()
      setNotice(ru ? 'Не удалось продолжить. Проверьте микрофон и соединение, затем нажмите «Начать».' : 'Could not continue. Check the microphone and connection, then press Start.')
      setPhase('error')
    }
    try {
      await microphone.start(async audio => {
        if (id !== epoch.current) return
        setNotice('')
        setPhase('processing')
        const controller = new AbortController()
        abort.current = controller
        const timeout = setTimeout(() => controller.abort(), 60_000)
        try {
          const form = new FormData()
          form.append('audio', audio, 'utterance.wav')
          form.append('first', first)
          form.append('second', second)
          const response = await fetch('/api/auto-dialogue', { method: 'POST', body: form, signal: controller.signal })
          const payload = await response.json()
          if (id !== epoch.current) return
          if (!response.ok) throw new Error('translation')
          if (payload.retry) {
            setNotice(payload.code === 'outside_pair'
              ? (ru ? 'Язык не входит в выбранную пару. Повторите на одном из выбранных языков.' : 'Language is outside the selected pair. Please repeat in one of those languages.')
              : (ru ? 'Скажите чуть более полную фразу: язык короткого ответа не удалось определить надёжно.' : 'Please say a fuller phrase so its language can be identified reliably.'))
            listenAgain(id)
            return
          }
          if (typeof payload.source !== 'string' || typeof payload.translation !== 'string' || typeof payload.audio !== 'string') throw new Error('invalid_reply')
          setTurns(previous => [...previous.slice(-9), payload as Turn])
          const bytes = Uint8Array.from(atob(payload.audio), char => char.charCodeAt(0))
          const buffer = await context.decodeAudioData(bytes.buffer)
          if (id !== epoch.current) return
          pending.current = buffer
          await play(id)
        } catch { fail() } finally { clearTimeout(timeout) }
      }, () => { if (id === epoch.current) setPhase('speaking') }, fail)
      if (id === epoch.current) setPhase('listening')
    } catch { fail() }
  }

  const phases: Record<Phase, string> = ru ? {
    ready: 'Готов к диалогу', connecting: 'Подключаю микрофон…', listening: 'Слушаю обоих собеседников',
    speaking: 'Слышу речь…', processing: 'Определяю язык и перевожу…', playing: 'Звучит перевод — дождитесь окончания',
    blocked: 'Нажмите «Включить звук», чтобы прослушать перевод', error: 'Диалог остановлен',
  } : {
    ready: 'Ready', connecting: 'Connecting microphone…', listening: 'Listening to both speakers', speaking: 'Speech detected…',
    processing: 'Detecting language and translating…', playing: 'Playing translation — please wait', blocked: 'Press Enable sound to hear the translation', error: 'Dialogue stopped',
  }

  return <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-lg sm:p-6">
    <h1 className="text-xl font-bold">{ru ? 'Автодиалог' : 'Auto dialogue'}</h1>
    <p className="mt-2 text-slate-600">{ru ? 'Выберите пару языков и нажмите «Начать». Говорите по очереди; пауза около секунды завершает реплику. После перевода можно отвечать без свопа.' : 'Choose two languages and press Start. Take turns; about a second of silence ends a phrase. Reply after the translation without swapping.'}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {[{ value: first, set: setFirst }, { value: second, set: setSecond }].map((item, index) => <label key={index} className="font-semibold">
        {ru ? `Язык ${index + 1}` : `Language ${index + 1}`}
        <select disabled={active} value={item.value} onChange={event => item.set(event.target.value)} className="mt-1 block w-full rounded-xl border p-3 disabled:opacity-60">
          {TRANSLATOR_LANGUAGES.filter(language => language.outputCode).map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
        </select>
      </label>)}
    </div>
    <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-primary-50 p-3 font-semibold">{phases[phase]}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button onClick={() => void start()} disabled={active || first === second} className="rounded-full bg-primary-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{copy.start}</button>
      <button onClick={() => { cleanup(); setPhase('ready'); setNotice('') }} disabled={!active} className="rounded-full border px-5 py-3 disabled:opacity-50">{copy.end}</button>
      {phase === 'blocked' && <button onClick={() => void play(epoch.current)} className="rounded-full bg-teal-700 px-5 py-3 text-white">{copy.enableSound}</button>}
    </div>
    {first === second && <p className="mt-2 text-amber-800">{copy.sameLanguage}</p>}
    {notice && <p role="alert" className="mt-3 text-amber-900">{notice}</p>}
    <p className="mt-3 text-sm text-slate-500">{ru ? 'Во время обработки и озвучивания микрофон приостановлен. Реплика — до 20 секунд. Голос перевода создан ИИ. Стоимость этого режима зависит от распознавания, текста и озвучивания; тариф потокового режима здесь не применяется.' : 'Microphone pauses during processing and playback. Up to 20 seconds per phrase. Translation uses an AI voice. Costs depend on transcription, text and speech usage; the streaming rate does not apply.'}</p>
    <ol className="mt-5 space-y-4">
      {turns.map((turn, index) => <li key={index} className="rounded-xl border p-4">
        <p className="text-sm font-bold text-primary-900">{label(turn.language)} → {label(turn.target)}</p>
        <p className="mt-2 whitespace-pre-wrap">{turn.source}</p>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-50 p-3">{turn.translation}</p>
        {turn.fidelity?.findings.length > 0 && <div role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-bold">{copy.fidelityReview}</p>
          {fidelityDisplayLines(turn.fidelity).map((line, i) => <p key={i}>{fidelityLineText(copy.fidelityCode[line.code] ?? copy.fidelityWarning, line.sourceFragment, line.translationFragment)}</p>)}
          <p>{copy.fidelityAskRepeat}</p>
        </div>}
      </li>)}
    </ol>
  </section>
}
