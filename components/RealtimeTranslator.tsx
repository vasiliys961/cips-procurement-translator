'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Locale } from '@/lib/i18n/config'
import { partyLabels, translatorUi, type TranslatorUi } from '@/lib/i18n/translator-ui'
import { REALTIME_TRANSLATION_CREDITS_PER_MINUTE } from '@/lib/cost-calculator'
import { recordUsageCost } from '@/lib/simple-logger'
import LanguageDetectPanel from '@/components/LanguageDetectPanel'
import { fidelityDisplayLines, fidelityLineText } from '@/lib/procurement-translate/fidelity-notice'
import { TurnGuard } from '@/lib/realtime-turn'
import { playTranslateCue, translationCue, unlockTranslateCue } from '@/lib/translate-cue'
import type { FidelityFinding } from '@/lib/procurement-translate/fidelity'
import {
  RealtimeTranslator,
  TRANSLATOR_LANGUAGES,
  TranslatorError,
  findTranslatorLanguage,
  inputOnlyLanguages,
  type ProcurementFidelityReport,
  type TranslatePhase,
} from '@/lib/realtime-translate'

function FidelityAlert({
  copy,
  findings,
  roleLabel,
  languageLabel,
}: {
  copy: TranslatorUi
  findings: FidelityFinding[]
  roleLabel: string
  languageLabel?: string
}) {
  const lines = fidelityDisplayLines({ findings })
  const critical = lines.some((line) => line.severity === 'critical')
  return (
    <div
      role={critical ? 'alert' : 'status'}
      className={
        critical
          ? 'mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-950'
          : 'mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950'
      }
    >
      <p className="font-semibold">
        {critical ? copy.fidelityCritical : copy.fidelityReview}
        {' · '}
        {roleLabel}
        {languageLabel ? ` · ${languageLabel}` : ''}
      </p>
      <ul className="mt-1 list-disc pl-5">
        {lines.map((line) => (
          <li key={`${line.severity}:${line.code}:${line.sourceFragment ?? ''}:${line.translationFragment ?? ''}`} className="break-words">
            {fidelityLineText(copy.fidelityCode[line.code] ?? copy.fidelityWarning, line.sourceFragment, line.translationFragment)}
          </li>
        ))}
      </ul>
      {critical ? (
        <>
          <p className="mt-1 font-semibold">{copy.fidelityConfirm}</p>
          <p>{copy.fidelityAskRepeat}</p>
        </>
      ) : null}
    </div>
  )
}

function describeError(error: unknown, copy: TranslatorUi): string {
  if (!(error instanceof TranslatorError)) return copy.errors.generic
  const fallback = copy.errors[error.code] ?? copy.errors.generic
  if ((error.code === 'webrtc' || error.code === 'client_secret') && error.message && error.message !== fallback) {
    return error.message
  }
  return fallback
}

function formatCredits(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1)
}

function SpeakerCard({
  title,
  hint,
  speaking,
  children,
}: {
  title: string
  hint: string
  speaking: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-3xl border-4 p-4 shadow-sm sm:p-5 ${
        speaking ? 'border-primary-600 bg-primary-50 shadow-md' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</p>
      <p className={`mt-1 text-sm font-semibold ${speaking ? 'text-primary-800' : 'text-slate-500'}`}>{hint}</p>
      {children}
    </div>
  )
}

function phaseClass(phase: TranslatePhase): string {
  switch (phase) {
    case 'listening':
      return 'bg-teal-50 text-teal-900 ring-teal-200'
    case 'translating':
      return 'bg-sky-50 text-sky-900 ring-sky-200'
    case 'connecting':
      return 'bg-amber-50 text-amber-900 ring-amber-200'
    case 'error':
      return 'bg-red-50 text-red-800 ring-red-200'
    case 'stopped':
      return 'bg-slate-100 text-slate-700 ring-slate-200'
    default:
      return 'bg-slate-50 text-slate-700 ring-slate-200'
  }
}

export default function RealtimeTranslatorPanel({ locale }: { locale: Locale }) {
  const copy = translatorUi[locale]
  const clientRef = useRef<RealtimeTranslator | null>(null)
  if (!clientRef.current) clientRef.current = new RealtimeTranslator()

  const [buyerLanguage, setBuyerLanguage] = useState('ru')
  const [supplierLanguage, setSupplierLanguage] = useState('en')
  const languagesRef = useRef({ buyer: 'ru', supplier: 'en' })
  const [phase, setPhase] = useState<TranslatePhase>('ready')
  const [error, setError] = useState('')
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translatedTranscript, setTranslatedTranscript] = useState('')
  const [fidelity, setFidelity] = useState<ProcurementFidelityReport | null>(null)
  const [warningRole, setWarningRole] = useState('')
  const [warningLanguage, setWarningLanguage] = useState('')
  const [cueOn, setCueOn] = useState(true)
  const [columnFlash, setColumnFlash] = useState<'start' | 'end' | null>(null)
  const [voicePlaying, setVoicePlaying] = useState(false)
  const [voiceBlocked, setVoiceBlocked] = useState(false)
  const [sessionCredits, setSessionCredits] = useState(0)
  const [speaker, setSpeaker] = useState<'buyer' | 'supplier' | null>(null)
  const [handingOver, setHandingOver] = useState(false)
  const [canContinue, setCanContinue] = useState(false)
  const speakerRef = useRef<'buyer' | 'supplier' | null>(null)
  const turns = useRef(new TurnGuard())
  const accruedMs = useRef(0)
  const runningSince = useRef<number | null>(null)
  const billedMs = useRef(0)
  const billingLock = useRef(false)
  const billingBlocked = useRef(false)
  const billingGeneration = useRef(0)
  const countedTranslatorCall = useRef(false)
  const copyRef = useRef(copy)
  copyRef.current = copy
  const cueOnRef = useRef(true)
  cueOnRef.current = cueOn

  const buyer = useMemo(
    () => findTranslatorLanguage(buyerLanguage),
    [buyerLanguage]
  )
  const supplier = useMemo(
    () => findTranslatorLanguage(supplierLanguage),
    [supplierLanguage]
  )
  const heardOnly = useMemo(() => inputOnlyLanguages(), [])

  const active = phase === 'connecting' || phase === 'listening' || phase === 'translating'
  const sameLanguage = buyerLanguage === supplierLanguage
  const supplierCanSpeak = Boolean(supplier?.outputCode)
  const buyerCanSpeak = Boolean(buyer?.outputCode)
  const canStart = !active && supplierCanSpeak && !sameLanguage

  const liveMs = () => {
    const running = runningSince.current != null ? Date.now() - runningSince.current : 0
    return accruedMs.current + running
  }

  const stopForBilling = (message: string) => {
    billingBlocked.current = true
    clientRef.current?.disconnect()
    setPhase('error')
    setVoicePlaying(false)
    setVoiceBlocked(false)
    setError(message)
  }

  const billUnbilled = async () => {
    if (billingLock.current || billingBlocked.current) return
    const delta = liveMs() - billedMs.current
    if (delta < 1000) return
    const generation = billingGeneration.current
    billingLock.current = true
    const seconds = delta / 1000
    try {
      const response = await fetch('/api/realtime-translate/usage', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds }),
      })
      const payload = await response.json().catch(() => ({}))
      if (generation !== billingGeneration.current) return
      if (!response.ok) {
        stopForBilling(copyRef.current.billingStopped)
        return
      }
      billedMs.current += delta
      const charged = Number(payload?.charged) || 0
      if (charged > 0) {
        recordUsageCost({
          section: 'translator',
          model: 'gpt-realtime-translate',
          costUnits: charged,
          countCall: !countedTranslatorCall.current,
        })
        countedTranslatorCall.current = true
        window.dispatchEvent(new Event('balanceUpdated'))
      }
    } catch {
      if (generation === billingGeneration.current) stopForBilling(copyRef.current.billingStopped)
    } finally {
      billingLock.current = false
    }
  }

  useEffect(() => {
    if (!active) {
      if (runningSince.current != null) {
        accruedMs.current += Date.now() - runningSince.current
        runningSince.current = null
        setSessionCredits((accruedMs.current / 60_000) * REALTIME_TRANSLATION_CREDITS_PER_MINUTE)
      }
      void billUnbilled()
      return
    }
    if (runningSince.current == null) runningSince.current = Date.now()
    const tick = () => {
      const live = Date.now() - (runningSince.current ?? Date.now())
      setSessionCredits(((accruedMs.current + live) / 60_000) * REALTIME_TRANSLATION_CREDITS_PER_MINUTE)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    const billingTimer = window.setInterval(() => {
      void billUnbilled()
    }, 20000)
    return () => {
      window.clearInterval(timer)
      window.clearInterval(billingTimer)
    }
  }, [active])

  useEffect(() => {
    const flush = () => {
      void billUnbilled()
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
      clientRef.current?.disconnect()
    }
  }, [])

  const rememberSpeaker = (next: 'buyer' | 'supplier' | null) => {
    speakerRef.current = next
    setSpeaker(next)
  }

  const end = () => {
    turns.current.close()
    rememberSpeaker(null)
    setHandingOver(false)
    clientRef.current?.disconnect()
    setPhase('stopped')
    setVoicePlaying(false)
    setVoiceBlocked(false)
    setFidelity(null)
    setSourceTranscript('')
    setTranslatedTranscript('')
    setCanContinue(false)
  }

  const begin = async (source: string, target: string, keepWarning = false) => {
    setError('')
    setSourceTranscript('')
    setTranslatedTranscript('')
    setCanContinue(false)
    if (!keepWarning) setFidelity(null)
    setVoicePlaying(false)
    setVoiceBlocked(false)
    const epoch = turns.current.capturedEpoch()
    try {
      await clientRef.current?.connect({
        sourceLanguage: source,
        targetLanguage: target,
        onPhase: setPhase,
        onSourceTranscript: (text) => {
          setSourceTranscript(text)
          if (text) setCanContinue(false)
        },
        onTranslatedTranscript: setTranslatedTranscript,
        onUtteranceEnd: () => {
          setColumnFlash('end')
        },
        onFidelity: (report) => {
          if (!turns.current.acceptsFidelity(epoch)) return
          if (!report) {
            setFidelity(null)
            return
          }
          const ui = copyRef.current
          const supplierSpeaking = speakerRef.current === 'supplier'
          const code = supplierSpeaking ? languagesRef.current.buyer : languagesRef.current.supplier
          setWarningRole(supplierSpeaking ? ui.buyerHears : ui.translation)
          setWarningLanguage(findTranslatorLanguage(code)?.label ?? '')
          setFidelity(report)
        },
        onVoiceOutput: (playing) => {
          setVoicePlaying(playing)
          setVoiceBlocked(!playing)
        },
        onError: (connectError) => setError(describeError(connectError, copy)),
      })
    } catch (connectError) {
      setPhase('error')
      setError(describeError(connectError, copy))
      setVoicePlaying(false)
      throw connectError
    }
  }

  const start = async () => {
    unlockTranslateCue()
    setError('')
    try {
      const response = await fetch('/api/realtime-translate/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: 0 }),
      })
      if (!response.ok) {
        setError(response.status === 401 ? copy.errors.unauthorized : copy.billingStopped)
        return
      }
    } catch {
      setError(copy.billingStopped)
      return
    }
    billingGeneration.current += 1
    accruedMs.current = 0
    runningSince.current = null
    billedMs.current = 0
    billingBlocked.current = false
    countedTranslatorCall.current = false
    setSessionCredits(0)
    rememberSpeaker('buyer')
    setHandingOver(false)
    void begin(languagesRef.current.buyer, languagesRef.current.supplier).catch(() => {
      rememberSpeaker(null)
    })
  }

  const passTurn = async () => {
    if (handingOver) return
    if (phase !== 'listening' && phase !== 'translating') return
    const current = speakerRef.current === 'supplier' ? 'supplier' : 'buyer'
    const next = current === 'buyer' ? 'supplier' : 'buyer'
    const { buyer, supplier } = languagesRef.current
    const source = next === 'buyer' ? buyer : supplier
    const target = next === 'buyer' ? supplier : buyer
    if (!findTranslatorLanguage(target)?.outputCode) {
      setError(copy.turnUnspeakable)
      return
    }
    const token = turns.current.startHandoff()
    if (token === null) return
    setHandingOver(true)
    setError('')
    clientRef.current?.muteInput()
    try {
      await clientRef.current?.whenQuiet()
      if (!turns.current.isHandoff(token)) return
      await begin(source, target, true)
      if (!turns.current.isHandoff(token)) return
      rememberSpeaker(next)
    } catch {
      if (turns.current.isHandoff(token)) rememberSpeaker(current)
    } finally {
      if (turns.current.isHandoff(token)) {
        turns.current.finishHandoff(token)
        setHandingOver(false)
      }
    }
  }

  const exchangeSpeakers = () => {
    if (handingOver) return
    const live = phase === 'listening' || phase === 'translating'
    if (live) {
      const supplierSpeaking = speakerRef.current === 'supplier'
      if (!supplierSpeaking && !buyerCanSpeak) return
      unlockTranslateCue()
      if (cueOnRef.current) playTranslateCue('swap')
      setCanContinue(false)
      void passTurn()
      return
    }
    if (phase === 'connecting') return
    if (!buyerCanSpeak) return
    unlockTranslateCue()
    if (cueOnRef.current) playTranslateCue('swap')
    languagesRef.current = { buyer: supplierLanguage, supplier: buyerLanguage }
    setBuyerLanguage(supplierLanguage)
    setSupplierLanguage(buyerLanguage)
    setError('')
  }

  const enableSound = async () => {
    unlockTranslateCue()
    const playing = await clientRef.current?.resumePlayback()
    setVoicePlaying(Boolean(playing))
    setVoiceBlocked(!playing)
  }

  const phaseRef = useRef(phase)
  useEffect(() => {
    const cue = translationCue(phaseRef.current, phase)
    phaseRef.current = phase
    if (phase === 'translating') setCanContinue(false)
    if (!cue) return
    if (cue === 'end') {
      if (cueOnRef.current) playTranslateCue('end')
      setCanContinue(true)
    }
    setColumnFlash(cue)
    const timer = window.setTimeout(() => setColumnFlash(null), 700)
    return () => window.clearTimeout(timer)
  }, [phase])

  const voiceLive = active && (voicePlaying || phase === 'listening' || phase === 'translating')
  const supplierTurn = speaker === 'supplier'
  const canPassTurn = (phase === 'listening' || phase === 'translating') && !handingOver && (supplierTurn || buyerCanSpeak)
  const swapDisabled = handingOver || (active ? !canPassTurn : !buyerCanSpeak)
  const parties = partyLabels[locale]
  const youSpeaking = active && !handingOver && !supplierTurn
  const otherSpeaking = active && !handingOver && supplierTurn
  const heardLanguage = supplierTurn ? supplier : buyer
  const spokenLanguage = supplierTurn ? buyer : supplier

  return (
    <section className="rounded-2xl border border-primary-100 bg-white p-5 shadow-lg sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_9rem_1fr]">
        <SpeakerCard title={parties.you} hint={youSpeaking ? copy.buyerSpeaking : copy.buyerHint} speaking={youSpeaking}>
          <p className="mt-3 text-xl font-bold text-primary-900">{buyer?.label}</p>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            {copy.buyerLanguage}
            <select
              value={buyerLanguage}
              disabled={active}
              onChange={(event) => {
                languagesRef.current.buyer = event.target.value
                setBuyerLanguage(event.target.value)
                setError('')
              }}
              className="mt-1 w-full rounded-xl border border-primary-200 bg-white px-3 py-3 text-base font-semibold shadow-sm disabled:opacity-60"
            >
              {TRANSLATOR_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </SpeakerCard>

        <button
          type="button"
          onClick={exchangeSpeakers}
          disabled={swapDisabled}
          className="flex min-h-28 w-full flex-col items-center justify-center gap-1 rounded-3xl bg-primary-700 px-3 py-4 text-white shadow-lg hover:bg-primary-800 disabled:opacity-50"
          aria-label={copy.swapAria}
          title={!buyerCanSpeak ? copy.voiceOnly : copy.swapTitle}
        >
          <span className="text-4xl leading-none" aria-hidden>
            ⇄
          </span>
          <span className="text-lg font-black">{copy.swap}</span>
          <span className="text-center text-xs font-semibold text-primary-100">
            {active ? (supplierTurn ? copy.nowBuyer : copy.nowSupplier) : copy.swapTitle}
          </span>
        </button>

        <SpeakerCard title={parties.other} hint={otherSpeaking ? copy.supplierSpeaking : copy.supplierHint} speaking={otherSpeaking}>
          <p className="mt-3 text-xl font-bold text-primary-900">{supplier?.label}</p>
          <label className="mt-3 block text-sm font-medium text-slate-700">
            {copy.supplierLanguage}
            <select
              value={supplierLanguage}
              disabled={active}
              onChange={(event) => {
                const next = findTranslatorLanguage(event.target.value)
                if (!next?.outputCode) return
                languagesRef.current.supplier = next.code
                setSupplierLanguage(next.code)
                setError('')
              }}
              className="mt-1 w-full rounded-xl border border-primary-200 bg-white px-3 py-3 text-base font-semibold shadow-sm disabled:opacity-60"
            >
              {TRANSLATOR_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code} disabled={!language.outputCode}>
                  {language.outputCode ? language.label : `${language.label} — ${copy.noVoice}`}
                </option>
              ))}
            </select>
          </label>
        </SpeakerCard>
      </div>

      {canContinue && (
        <p role="status" className="mt-4 rounded-2xl bg-teal-600 px-4 py-3 text-lg font-bold text-white">
          {parties.phraseDone}
        </p>
      )}

      {sameLanguage && (
        <p className="mt-2 text-sm text-amber-800">{copy.sameLanguage}</p>
      )}

      {(active || handingOver) && (
        <p className="mt-6 rounded-2xl bg-primary-900 px-4 py-3 text-base font-semibold text-white" role="status">
          {handingOver ? copy.handingOver : supplierTurn ? copy.supplierSpeaking : copy.buyerSpeaking}
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`mt-3 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-base font-semibold ring-1 ${phaseClass(phase)}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            phase === 'translating' || phase === 'listening' ? 'bg-current animate-pulse' : 'bg-current'
          }`}
          aria-hidden
        />
        {copy.phase[phase]}
      </div>
      <button
        type="button"
        onClick={() => setCueOn((on) => !on)}
        className="mt-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800"
        aria-pressed={cueOn}
      >
        {cueOn ? copy.cueOn : copy.cueOff}
      </button>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={!canStart || handingOver}
          className="rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-600 disabled:opacity-50"
        >
          {copy.start}
        </button>
        <button
          type="button"
          onClick={end}
          disabled={!active && !handingOver}
          className="rounded-full border border-primary-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary-900 hover:bg-primary-50 disabled:opacity-50"
        >
          {copy.end}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{copy.turnHint}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">
        {copy.costRate.replace('{rate}', formatCredits(REALTIME_TRANSLATION_CREDITS_PER_MINUTE))}
        {active || sessionCredits > 0
          ? ` · ${copy.costSession.replace('{credits}', formatCredits(sessionCredits))}`
          : ''}
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div
        className={`mt-6 flex flex-col gap-2 rounded-xl px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
          voiceLive ? 'bg-primary-50 text-primary-900 ring-1 ring-primary-200' : 'bg-slate-50 text-slate-600'
        }`}
      >
        <p className="font-medium">
          {voiceBlocked && active ? (
            copy.voiceBlocked
          ) : (
            <>
              <span className={phase === 'translating' ? 'inline-block animate-pulse' : ''} aria-hidden>
                🔊{' '}
              </span>
              {supplierTurn ? copy.voiceForBuyer : copy.voiceSpoken}
              {phase === 'translating' ? ` ${copy.voiceNow}` : ''}
            </>
          )}
        </p>
        {voiceBlocked && active && (
          <button
            type="button"
            onClick={enableSound}
            className="w-fit rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-teal-900 ring-1 ring-teal-300"
          >
            {copy.enableSound}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">{copy.headphones}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {supplierTurn ? copy.supplierSaid : copy.sourceSpeech}
            {heardLanguage ? ` · ${heardLanguage.label}` : ''}
          </h2>
          <p className="mt-2 min-h-36 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-base text-slate-800">
            {sourceTranscript || (supplierTurn ? copy.supplierSourceEmpty : copy.sourceEmpty)}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {supplierTurn ? copy.buyerHears : copy.translation}
            {spokenLanguage ? ` · ${spokenLanguage.label}` : ''}
          </h2>
          <p
            className={`mt-2 min-h-36 whitespace-pre-wrap rounded-2xl p-4 text-base text-slate-800 transition-colors ${
              columnFlash === 'start'
                ? 'bg-sky-100 ring-2 ring-sky-500'
                : columnFlash === 'end'
                  ? 'bg-teal-50 ring-2 ring-teal-500'
                  : 'bg-primary-50'
            }`}
          >
            {translatedTranscript || (supplierTurn ? copy.buyerHearsEmpty : copy.translationEmpty)}
          </p>
          {fidelity && fidelity.findings.length > 0 && (
            <FidelityAlert
              copy={copy}
              findings={fidelity.findings}
              roleLabel={warningRole}
              languageLabel={warningLanguage}
            />
          )}
        </div>
      </div>

      <p className="mt-6 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
        {copy.openaiNotice}
      </p>
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
        {heardOnly.map((language) => language.label).join(', ')}: {copy.voiceOnly}
      </p>
      <LanguageDetectPanel
        locale={locale}
        disabled={active || handingOver}
        onApply={(buyerCode, supplierCode) => {
          languagesRef.current = { buyer: buyerCode, supplier: supplierCode }
          setBuyerLanguage(buyerCode)
          setSupplierLanguage(supplierCode)
          setError('')
        }}
      />
    </section>
  )
}
