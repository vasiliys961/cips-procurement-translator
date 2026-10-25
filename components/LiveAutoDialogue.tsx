'use client'

import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { appUi, formatUi } from '@/lib/i18n/app-ui'
import { translatorUi } from '@/lib/i18n/translator-ui'
import { LIVE_DIALOGUE_LANGUAGES, findLiveLanguage, liveLanguageLabel, validLivePair } from '@/lib/live-languages'
import { DialogueRealtime, type LivePhase, type LiveTurn } from '@/lib/dialogue-realtime'
import { assessProcurementFidelity, type ProcurementFidelityReport } from '@/lib/procurement-translate/fidelity'
import { fidelityDisplayLines, fidelityLineText } from '@/lib/procurement-translate/fidelity-notice'
import { PROCUREMENT_LANGUAGES, hasProcurementGlossary } from '@/lib/procurement-translate/coverage'

type Phase = LivePhase | 'ready' | 'error'
type Turn = LiveTurn & { fidelity?: ProcurementFidelityReport }

export default function LiveAutoDialogue({ locale, onActiveChange }: { locale: Locale; onActiveChange: (active: boolean) => void }) {
  const ui = appUi[locale]
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
    try {
      const pair = JSON.parse(localStorage.getItem('translator-live-pair') || 'null')
      if (Array.isArray(pair) && pair.length === 2 && validLivePair(pair[0], pair[1])) {
        setFirst(pair[0]); setSecond(pair[1])
      }
    } catch { /* Optional browser preference. */ }
    const hidden = () => { if (document.hidden) stop() }
    window.addEventListener('pagehide', stop)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pagehide', stop)
      document.removeEventListener('visibilitychange', hidden)
      client.current?.stop()
    }
  }, [])

  const changePair = (index: number, code: string) => {
    if (active) stop()
    setError('')
    const pair = index === 0 ? [code, second] : [first, code]
    if (index === 0) setFirst(code); else setSecond(code)
    if (validLivePair(pair[0], pair[1])) {
      try { localStorage.setItem('translator-live-pair', JSON.stringify(pair)) } catch { /* Optional. */ }
    }
  }
  const start = () => {
    client.current?.stop()
    const connection = new DialogueRealtime()
    client.current = connection
    setError(''); setTurns([]); setBlocked(false); setPhase('connecting')
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError('browser'); setPhase('error'); return
    }
    void connection.start({
      first, second, onPhase: setPhase, onBlocked: setBlocked,
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
        setError(problem.name === 'NotAllowedError' ? 'microphone_denied' : problem.message)
        setPhase('error'); setBlocked(false)
      },
    })
  }
  const errorText = ui.live.errors[error as keyof typeof ui.live.errors] || ui.live.errors.generic
  const experimental = [first, second].filter(code => findLiveLanguage(code)?.experimental)
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

  return <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-lg sm:p-6">
    <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold">{ui.live.title}</h1><span className="rounded-full bg-teal-100 px-3 py-1 text-sm font-bold text-teal-900">Realtime</span></div>
    <p className="mt-2 text-slate-600">{ui.live.description}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{[first, second].map((value, i) => <label key={i} className="font-semibold">
      {formatUi(ui.live.languageLabel, { number: i + 1 })}
      <select value={value} aria-describedby="procurement-glossary-legend" onChange={event => changePair(i, event.target.value)} className="mt-1 block w-full rounded-xl border p-3">
        {LIVE_DIALOGUE_LANGUAGES.map(language => {
          const label = liveLanguageLabel(language.code, locale)
          const native = label.toLocaleLowerCase() === language.nativeName.toLocaleLowerCase() ? '' : ` (${language.nativeName})`
          return <option key={language.code} value={language.code}>{label}{native}{hasProcurementGlossary(language.code) ? ' ◆' : ''}{language.experimental ? ` — ${ui.common.experimental}` : ''}</option>
        })}
      </select>
    </label>)}</div>
    <p id="procurement-glossary-legend" className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-900">{formatUi(ui.live.procurementGlossaryLegend, { count: PROCUREMENT_LANGUAGES.length })}</p>
    {experimental.length > 0 && <p role="note" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">{formatUi(ui.live.experimentalWarning, { languages: experimental.map(code => liveLanguageLabel(code, locale)).join(', ') })}</p>}
    <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-primary-50 p-3 font-semibold">{blocked ? ui.live.soundBlocked : ui.live.phase[phase]}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <button disabled={!active && !validLivePair(first, second)} onClick={active ? stop : start} className={`rounded-full px-5 py-3 font-semibold text-white disabled:opacity-50 ${active ? 'bg-red-700 hover:bg-red-800' : 'bg-primary-700 hover:bg-primary-800'}`}>{active ? ui.live.stop : ui.live.start}</button>
      {blocked && <button onClick={async () => { if (await client.current?.enableSound()) { setBlocked(false); setPhase('listening') } }} className="rounded-full bg-teal-700 px-5 py-3 text-white">{ui.live.enableSound}</button>}
    </div>
    {first === second && <p className="mt-2 text-amber-800">{ui.live.sameLanguage}</p>}
    {error && <p role="alert" className="mt-3 text-red-800">{errorText}</p>}
    <p className="mt-3 text-sm text-slate-500">{ui.live.notice}</p>
    <ol className="mt-5 space-y-4">{turns.map(turn => <li key={turn.id} className="rounded-xl border p-4">
      <p className="text-sm font-bold text-primary-900">{ui.live.sourceTranslation}</p>
      <p dir="auto" className="mt-2 whitespace-pre-wrap">{turn.source || ui.live.transcribing}</p>
      {turn.translation && <p dir="auto" className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-50 p-3">{turn.translation}</p>}
      {turn.latencyMs !== undefined && <p className="mt-2 text-xs text-slate-500">{ui.live.latency}: {number.format(turn.latencyMs / 1000)} {ui.live.seconds}</p>}
      {turn.fidelity && turn.fidelity.findings.length > 0 && <div role="alert" className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950"><p className="font-bold">{copy.fidelityReview}</p>{fidelityDisplayLines(turn.fidelity).map((line, i) => <p key={i}>{fidelityLineText(copy.fidelityCode[line.code] ?? copy.fidelityWarning, line.sourceFragment, line.translationFragment)}</p>)}<p>{copy.fidelityAskRepeat}</p></div>}
    </li>)}</ol>
  </section>
}
