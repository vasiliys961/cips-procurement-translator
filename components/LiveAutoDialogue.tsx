'use client'

import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { translatorUi } from '@/lib/i18n/translator-ui'
import { TRANSLATOR_LANGUAGES } from '@/lib/realtime-translate'
import { DialogueRealtime, type LivePhase, type LiveTurn } from '@/lib/dialogue-realtime'
import { assessProcurementFidelity, type ProcurementFidelityReport } from '@/lib/procurement-translate/fidelity'
import { fidelityDisplayLines, fidelityLineText } from '@/lib/procurement-translate/fidelity-notice'

type Phase = LivePhase | 'ready' | 'error'
type Turn = LiveTurn & { fidelity?: ProcurementFidelityReport }

export default function LiveAutoDialogue({ locale, onActiveChange }: { locale: Locale; onActiveChange: (active: boolean) => void }) {
  const ru = locale === 'ru'
  const copy = translatorUi[locale]
  const [first, setFirst] = useState('ru')
  const [second, setSecond] = useState('en')
  const [phase, setPhase] = useState<Phase>('ready')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const client = useRef<DialogueRealtime | null>(null)
  const active = phase !== 'ready' && phase !== 'error'
  const stop = () => { client.current?.stop(); setPhase('ready'); setBlocked(false) }
  useEffect(() => { onActiveChange(active) }, [active, onActiveChange])
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop() }
    window.addEventListener('pagehide', stop)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', stop)
      document.removeEventListener('visibilitychange', hidden)
      client.current?.stop()
    }
  }, [])

  const start = () => {
    client.current?.stop()
    const connection = new DialogueRealtime()
    client.current = connection
    setError('')
    setTurns([])
    setBlocked(false)
    setPhase('connecting')
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError(ru ? 'Нужны браузер с WebRTC и разрешение микрофона. Откройте localhost:3002 в Chrome или Safari.' : 'WebRTC and microphone permission are required. Open localhost:3002 in Chrome or Safari.')
      setPhase('error')
      return
    }
    void connection.start({
      first, second,
      onPhase: setPhase,
      onBlocked: setBlocked,
      onTurn: turn => setTurns(previous => {
        const existing = previous.find(item => item.id === turn.id)
        let fidelity = existing?.fidelity
        if (turn.done && turn.source && turn.translation &&
          (!existing?.done || existing.source !== turn.source || existing.translation !== turn.translation)) {
          fidelity = assessProcurementFidelity({ source: turn.source, translation: turn.translation, priorSources: previous.filter(item => item.id !== turn.id).slice(-6).map(item => item.source) })
        }
        const updated = { ...turn, fidelity }
        return existing ? previous.map(item => item.id === turn.id ? updated : item) : [...previous.slice(-9), updated]
      }),
      onError: problem => {
        const code = problem.name === 'NotAllowedError' ? 'microphone_denied' : problem.message
        const messages: Record<string, string> = ru ? {
          microphone_timeout: 'Браузер не ответил на запрос микрофона. Разрешите доступ или откройте localhost:3002 в Chrome/Safari.',
          microphone_denied: 'Разрешите микрофон для страницы и браузера в настройках macOS.',
          microphone_lost: 'Микрофон отключён. Подключите его и начните снова.',
          missing_api_key: 'На локальном сервере не настроен API-ключ.',
          realtime_failed: 'Не удалось подключиться к OpenAI Realtime. Проверьте сеть и повторите запуск.',
          connection_lost: 'Соединение прервано. Нажмите «Старт» для повторного подключения.',
          connection_timeout: 'Не удалось установить аудиосоединение. Проверьте сеть и повторите запуск.',
          response_timeout: 'Модель не ответила вовремя. Повторите запуск.',
          response_failed: 'Не удалось перевести реплику. Повторите запуск.',
        } : {
          microphone_timeout: 'Microphone request timed out. Allow access or open localhost:3002 in Chrome/Safari.',
          microphone_denied: 'Allow microphone access for this page and browser in macOS settings.',
          microphone_lost: 'Microphone disconnected. Reconnect and start again.',
          realtime_failed: 'Could not connect to OpenAI Realtime. Check your network and try again.',
          connection_lost: 'Connection lost. Press Start to reconnect.',
          connection_timeout: 'Audio connection timed out. Check your network and try again.',
          response_timeout: 'Model response timed out. Start again.',
          response_failed: 'Translation failed. Start again.',
        }
        const detail = problem.message.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 250)
        setError(messages[code] || detail)
        setPhase('error')
        setBlocked(false)
      },
    })
  }
  const phases: Record<Phase, string> = ru ? {
    ready: 'Готов к диалогу', connecting: 'Подключаю живой перевод — разрешите микрофон…',
    listening: 'Слушаю — можно говорить на любом из двух языков', speaking: 'Слышу речь…',
    translating: 'Перевожу…', playing: 'Звучит перевод — дождитесь окончания', error: 'Диалог остановлен',
  } : {
    ready: 'Ready', connecting: 'Connecting live translation — allow microphone access…',
    listening: 'Listening — speak either selected language', speaking: 'Speech detected…',
    translating: 'Translating…', playing: 'Playing translation — please wait', error: 'Dialogue stopped',
  }
  return <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-lg sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{ru ? 'Живой автодиалог' : 'Live auto dialogue'}</h1><span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-900">Realtime</span></div>
    <p className="mt-2 text-slate-600">{ru ? 'Нажмите «Старт» один раз. Когда появится «Слушаю», говорите по очереди. Перевод звучит автоматически после короткой паузы. Своп и предварительные фразы не нужны.' : 'Press Start once. When Listening appears, take turns speaking. Translation starts automatically after a brief pause. No swapping or training phrases needed.'}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{[{ value: first, set: setFirst }, { value: second, set: setSecond }].map((item, i) => <label key={i} className="font-semibold">{ru ? `Язык ${i + 1}` : `Language ${i + 1}`}<select value={item.value} disabled={active} onChange={event => item.set(event.target.value)} className="mt-1 block w-full rounded-xl border p-3 disabled:opacity-60">{TRANSLATOR_LANGUAGES.filter(language => language.outputCode).map(language => <option key={language.code} value={language.code}>{language.label}</option>)}</select></label>)}</div>
    <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-primary-50 p-3 font-semibold">{blocked ? (ru ? 'Нажмите «Включить звук»' : 'Press Enable sound') : phases[phase]}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button disabled={active || first === second} onClick={start} className="rounded-full bg-primary-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{active ? (ru ? 'Диалог запущен' : 'Dialogue running') : copy.start}</button>
      <button disabled={!active} onClick={stop} className="rounded-full border px-5 py-3 disabled:opacity-50">{copy.end}</button>
      {blocked && <button onClick={async () => { if (await client.current?.enableSound()) { setBlocked(false); setPhase('listening') } }} className="rounded-full bg-teal-700 px-5 py-3 text-white">{copy.enableSound}</button>}
    </div>
    {first === second && <p className="mt-2 text-amber-800">{copy.sameLanguage}</p>}
    {error && <p role="alert" className="mt-3 text-red-800">{error}</p>}
    <p className="mt-3 text-sm text-slate-500">{ru ? 'Речь передаётся в OpenAI во время разговора. Голос перевода создан ИИ. Пока звучит перевод, микрофон приглушён. Расходы Realtime отличаются от прежнего тарифа по минутам.' : 'Speech streams to OpenAI during the conversation. Translation uses an AI voice. Microphone is muted during translated speech. Realtime usage differs from the previous per-minute rate.'}</p>
    <ol className="mt-5 space-y-4">{turns.map(turn => <li key={turn.id} className="rounded-xl border p-4">
      <p className="text-sm font-bold text-primary-900">{ru ? 'Оригинал → перевод' : 'Original → translation'}</p>
      <p className="mt-2 whitespace-pre-wrap">{turn.source || (ru ? 'Распознаю текст…' : 'Transcribing…')}</p>
      {turn.translation && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-50 p-3">{turn.translation}</p>}
      {turn.latencyMs !== undefined && <p className="mt-2 text-xs text-slate-500">{ru ? 'Начало озвучки после определения конца реплики' : 'Speech start after turn end detected'}: {(turn.latencyMs / 1000).toFixed(1)} {ru ? 'с' : 's'}</p>}
      {turn.fidelity && turn.fidelity.findings.length > 0 && <div role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">{copy.fidelityReview}</p>{fidelityDisplayLines(turn.fidelity).map((line, i) => <p key={i}>{fidelityLineText(copy.fidelityCode[line.code] ?? copy.fidelityWarning, line.sourceFragment, line.translationFragment)}</p>)}<p>{copy.fidelityAskRepeat}</p></div>}
    </li>)}</ol>
  </section>
}
