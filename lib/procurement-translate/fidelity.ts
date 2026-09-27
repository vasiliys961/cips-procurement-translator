/**
 * Compares one spoken utterance with the realtime translation.
 *
 * It does not translate, rewrite, or call a model. The speech session is
 * unchanged. A mismatch becomes a warning; the original wording stays.
 * The checks follow CIPS procurement language: prices, Incoterms, parties,
 * payment instruments, and contract terms.
 */

import {
  PROCUREMENT_GLOSSARY,
  entryAppears,
  formSpans,
  isCjkText,
  maskForms,
  normalizeProcurementText,
  textHasForm,
  type GlossaryEntry,
} from './glossary'

export type FidelityCode =
  | 'number'
  | 'unit'
  | 'negation'
  | 'instrument'
  | 'frequency'
  | 'duration'
  | 'uncertainty'
  | 'term'
  | 'incoterm'
  | 'abbreviation'
  | 'party'
  | 'basis'
  | 'document'
  | 'relation'

export type FidelityFinding = {
  severity: 'critical' | 'important'
  code: FidelityCode
  detail: string
  /** Short span taken from the source utterance. Omitted when the match is not unique. */
  sourceFragment?: string
  /** Short span taken from the translation. Omitted when the match is not unique. */
  translationFragment?: string
}

export type ProcurementFidelityReport = {
  findings: FidelityFinding[]
}

export type ProcurementFidelityInput = {
  source: string
  translation: string
  priorSources?: readonly string[]
}

type Quantity = {
  value: string
  unit: string
  surface: string
}

const NUMBER_WORDS: Record<string, string> = {
  один: '1',
  одна: '1',
  одно: '1',
  одного: '1',
  одной: '1',
  one: '1',
  два: '2',
  две: '2',
  двух: '2',
  two: '2',
  twice: '2',
  три: '3',
  трёх: '3',
  трех: '3',
  three: '3',
  thrice: '3',
  четыре: '4',
  четырёх: '4',
  четырех: '4',
  four: '4',
  пять: '5',
  пяти: '5',
  five: '5',
  шесть: '6',
  шести: '6',
  six: '6',
  семь: '7',
  семи: '7',
  seven: '7',
  восемь: '8',
  восьми: '8',
  eight: '8',
  девять: '9',
  девяти: '9',
  nine: '9',
  десять: '10',
  десяти: '10',
  ten: '10',
  одиннадцать: '11',
  eleven: '11',
  двенадцать: '12',
  twelve: '12',
  uno: '1',
  una: '1',
  un: '1',
  une: '1',
  uma: '1',
  dos: '2',
  deux: '2',
  dois: '2',
  duas: '2',
  tres: '3',
  trois: '3',
  cuatro: '4',
  quatre: '4',
  cinco: '5',
  cinq: '5',
  seis: '6',
  siete: '7',
  sept: '7',
  oito: '8',
  huit: '8',
  nueve: '9',
  neuf: '9',
  diez: '10',
  dix: '10',
  dez: '10',
  once: '11',
  onze: '11',
  doce: '12',
  douze: '12',
}

const UNCERTAINTY_MARKERS = [
  'не уверен',
  'не уверена',
  'not sure',
  'i suspect',
  'i think',
  'возможно',
  'вероятно',
  'кажется',
  'подозреваю',
  'думаю',
  'possibly',
  'probably',
  'perhaps',
  'sometimes',
  'maybe',
  'seems',
  'seem',
  'often',
  'rarely',
  'may be',
  'may have',
  'might',
  'иногда',
  'часто',
  'редко',
  'es posible',
  'posible',
  'posiblemente',
  'il est possible',
  'peut-etre',
  'possivelmente',
  'possivel',
  'talvez',
  'не является офертой',
  'subject to contract',
  'non binding',
  'indicative',
  'ориентировочно',
  'ориентировочная',
  'ориентировочной',
  'без обязательств',
  '可能',
  '也许',
  '大约',
  '大概',
  'かもしれません',
  'かもしれない',
  'おそらく',
]

const NEGATION_CUES = [
  'никогда не было',
  'никогда не',
  'не было',
  'n ai jamais',
  'n a jamais',
  'n ai pas',
  'n a pas',
  'nunca he tenido',
  'nunca tive',
  '从来没有',
  'ではありません',
  'ではない',
  'no history of',
  'have never',
  'has never',
  'never had',
  'did not',
  'does not',
  'do not',
  'have not',
  'has not',
  'had not',
  'отрицает',
  'отсутствует',
  'никогда',
  'denies',
  'denied',
  'without',
  'never',
  'none',
  'not',
  'no',
  'без',
  'не',
  'нет',
  'nunca',
  'jamas',
  'jamais',
  'ninguna',
  'nenhuma',
  'nenhum',
  'sans',
  'sem',
  'nao',
  'aucune',
  'aucun',
  'niega',
  'nega',
  '没有',
  '从未',
  '从不',
  'ありません',
  'なかった',
  'ません',
  'ない',
]

const DURATION_UNITS: Array<{ unit: string; pattern: string }> = [
  { unit: 'minute', pattern: 'минут(?:а|ы|у|е)?|minutes?|mins?|minutos?' },
  { unit: 'hour', pattern: 'час(?:а|ов)?|hours?|horas?|heures?' },
  { unit: 'day', pattern: 'день|дня|дней|сутки|суток|days?|dias?|jours?' },
  { unit: 'week', pattern: 'недел(?:ь|я|и|ю|ей)?|weeks?|semanas?|semaines?' },
  { unit: 'month', pattern: 'месяц(?:а|ев)?|months?|mes(?:es)?|mois' },
  { unit: 'year', pattern: 'лет|год(?:а|ов)?|years?|anos?|ans?|annees?' },
]

function canonNumber(token: string): string {
  const word = NUMBER_WORDS[normalizeProcurementText(token)]
  if (word) return word
  const parsed = Number(token)
  if (!Number.isFinite(parsed)) return ''
  const rounded = Math.round(parsed * 1000) / 1000
  return String(rounded)
}

const CJK_DIGIT_VALUE: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}

function canonCjkNumber(token: string): string {
  const digits = normalizeProcurementText(token)
  if (/^\d+(?:\.\d+)?$/.test(digits)) return canonNumber(digits)
  if (digits === '十') return '10'
  if (digits.startsWith('十') && digits.length === 2) {
    const ones = CJK_DIGIT_VALUE[digits[1]]
    if (ones) return String(10 + ones)
  }
  if (digits.endsWith('十') && digits.length === 2) {
    const tens = CJK_DIGIT_VALUE[digits[0]]
    if (tens) return String(tens * 10)
  }
  if (CJK_DIGIT_VALUE[digits]) return String(CJK_DIGIT_VALUE[digits])
  return canonNumber(digits)
}

function numberSource(): string {
  const words = Object.keys(NUMBER_WORDS).sort((left, right) => right.length - left.length)
  return `(?:${words.join('|')}|\\d+(?:\\.\\d+)?)`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function unitAlternative(form: string): string {
  const parts = normalizeProcurementText(form).trim().split(/\s+/).map(escapeRegExp)
  const body = parts.join('\\s+')
  if (isCjkText(body)) return body
  if (parts.length === 1 && parts[0].length <= 3) {
    return `(?<!\\p{L})${body}(?!\\p{L})`
  }
  return body
}

function measurementText(raw: string): string {
  return normalizeProcurementText(raw)
    .replace(/(\d) (\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d),(\d)/g, '$1.$2')
}

function unitsCompatible(source: string, target: string): boolean {
  if (source === target) return true
  if (source === 'number') return true
  if ((source === 'per_day' && target === 'times') || (source === 'times' && target === 'per_day')) return true
  return false
}

function family(unit: string): 'frequency' | 'duration' | 'unit' | 'number' {
  if (
    unit === 'per_day' ||
    unit === 'times' ||
    unit === 'per_month' ||
    unit === 'per_quarter' ||
    unit === 'per_year'
  ) {
    return 'frequency'
  }
  if (unit.endsWith('_ago') || DURATION_UNITS.some((item) => item.unit === unit)) return 'duration'
  if (unit === 'number') return 'number'
  return 'unit'
}

type Range = { start: number; end: number }

function overlaps(ranges: Range[], start: number, end: number): boolean {
  return ranges.some((range) => start < range.end && end > range.start)
}

function extractQuantities(raw: string): Quantity[] {
  const text = measurementText(raw)
  const found: Quantity[] = []
  const taken: Range[] = []

  const claim = (start: number, end: number, value: string, unit: string) => {
    if (!value || overlaps(taken, start, end)) return
    taken.push({ start, end })
    const surface = text.slice(start, end).replace(/\s+/g, ' ').trim()
    found.push({ value, unit, surface })
  }

  const units = [...PROCUREMENT_GLOSSARY.units].sort(
    (left, right) =>
      Math.max(...right.forms.map((form) => form.length)) - Math.max(...left.forms.map((form) => form.length))
  )
  const amountToken = numberSource()
  for (const unit of units) {
    const pattern = [...unit.forms]
      .sort((left, right) => right.length - left.length)
      .map(unitAlternative)
      .join('|')
    const trailing = new RegExp(`(?<=^|[^\\p{L}\\p{N}])(${amountToken})\\s*(?:${pattern})`, 'giu')
    const leading = new RegExp(`(?:${pattern})\\s*(${amountToken})(?=$|[^\\p{L}\\p{N}])`, 'giu')
    for (const match of text.matchAll(trailing)) {
      const start = match.index ?? 0
      claim(start, start + match[0].length, canonNumber(match[1]), unit.id)
    }
    for (const match of text.matchAll(leading)) {
      const start = match.index ?? 0
      claim(start, start + match[0].length, canonNumber(match[1]), unit.id)
    }
  }

  const amount = numberSource()
  const frequencies: Array<{ re: RegExp; unit: string; value?: string }> = [
    { re: /(?:^|[^\p{L}\p{N}])bid(?=$|[^\p{L}\p{N}])/giu, unit: 'per_day', value: '2' },
    { re: /(?:^|[^\p{L}\p{N}])tid(?=$|[^\p{L}\p{N}])/giu, unit: 'per_day', value: '3' },
    { re: /(?:^|[^\p{L}\p{N}])qid(?=$|[^\p{L}\p{N}])/giu, unit: 'per_day', value: '4' },
    { re: new RegExp(`(?:once|twice|thrice)\\s+(?:a|per)\\s+day`, 'giu'), unit: 'per_day' },
    { re: new RegExp(`${amount}\\s+times\\s+(?:a|per)\\s+day`, 'giu'), unit: 'per_day' },
    { re: new RegExp(`${amount}\\s+раз(?:а)?\\s+в\\s+(?:день|сутки)`, 'giu'), unit: 'per_day' },
    { re: new RegExp(`(${amount})\\s+veces\\s+(?:al|por)\\s+dia`, 'giu'), unit: 'per_day' },
    { re: new RegExp(`(${amount})\\s+fois\\s+par\\s+jour`, 'giu'), unit: 'per_day' },
    { re: new RegExp(`(${amount})\\s+vezes\\s+(?:ao|por)\\s+dia`, 'giu'), unit: 'per_day' },
    { re: /дважды\s+в\s+день/giu, unit: 'per_day', value: '2' },
    { re: /(?:每天|每日|一天|一日|1日)([0-9]{1,2}|十[一二三四五六七八九]?|[一二三四五六七八九两兩]十|[一二两三兩四五六七八九十])次/gu, unit: 'per_day' },
    { re: /(?:毎日|一日|1日)([0-9]{1,2}|[一二三四五六七八九十両])回/gu, unit: 'per_day' },
    { re: /(?:once|twice|thrice|дважды)/giu, unit: 'times' },
    { re: /ежемесячн|каждый месяц|раз в месяц|monthly|per month|al mes|par mois|每月/giu, unit: 'per_month', value: '1' },
    { re: /ежеквартальн|quarterly|per quarter|每季度/giu, unit: 'per_quarter', value: '1' },
    { re: /ежегодно|annually|per year|(?:^|[^\p{L}\p{N}])в год(?=$|[^\p{L}\p{N}])|每年/giu, unit: 'per_year', value: '1' },
  ]
  for (const frequency of frequencies) {
    for (const match of text.matchAll(frequency.re)) {
      const start = match.index ?? 0
      const token = match[1] || match[0].split(/\s+/)[0]
      claim(start, start + match[0].length, frequency.value || canonCjkNumber(token), frequency.unit)
    }
  }

  for (const duration of DURATION_UNITS) {
    const leading = new RegExp(
      `(?:hace|il y a|ha)(?:\\s+(?:unos|unas|environ|aproximadamente|cerca de))*\\s+(${amount})\\s+(?:${duration.pattern})(?![\\p{L}\\p{N}])`,
      'giu'
    )
    for (const match of text.matchAll(leading)) {
      const start = match.index ?? 0
      claim(start, start + match[0].length, canonCjkNumber(match[1]), `${duration.unit}_ago`)
    }
    const re = new RegExp(
      `(${amount})\\s+(?:${duration.pattern})(?![\\p{L}\\p{N}])(?:\\s+(?:назад|ago|ранее|раньше|previously|atras|en arriere))?`,
      'giu'
    )
    for (const match of text.matchAll(re)) {
      const start = match.index ?? 0
      const ago = /назад|ago|ранее|раньше|previously|atras|en arriere/iu.test(match[0])
      claim(start, start + match[0].length, canonCjkNumber(match[1]), ago ? `${duration.unit}_ago` : duration.unit)
    }
  }

  const cjkAmount = '(?:[0-9]{1,2}|十[一二三四五六七八九]?|[一二三四五六七八九两兩]十|[一二两三兩四五六七八九十])'
  const cjkDurations: Array<{ re: RegExp; unit: string; ago?: boolean }> = [
    { re: new RegExp(`(?:大约|大概|約)?(${cjkAmount})\\s*个?\\s*(?:小时|小時|時間)前`, 'gu'), unit: 'hour', ago: true },
    { re: new RegExp(`(?:大约|大概|約)?(${cjkAmount})\\s*个?\\s*(?:小时|小時|時間)`, 'gu'), unit: 'hour' },
    { re: new RegExp(`(${cjkAmount})\\s*(?:分钟|分鐘)前`, 'gu'), unit: 'minute', ago: true },
    { re: new RegExp(`(${cjkAmount})\\s*(?:分钟|分鐘|分)(?!钟)`, 'gu'), unit: 'minute' },
    { re: new RegExp(`(${cjkAmount})(?:天|日)前`, 'gu'), unit: 'day', ago: true },
    { re: new RegExp(`(${cjkAmount})年(?:前)?`, 'gu'), unit: 'year' },
  ]
  for (const duration of cjkDurations) {
    for (const match of text.matchAll(duration.re)) {
      const start = match.index ?? 0
      const ago = duration.ago || /前/u.test(match[0])
      claim(start, start + match[0].length, canonCjkNumber(match[1]), ago ? `${duration.unit}_ago` : duration.unit)
    }
  }

  const net = /(?:^|[^\p{L}\p{N}])(?:net|нетто|netto)\s+(\d{1,3})(?!\d)/giu
  for (const match of text.matchAll(net)) {
    const start = match.index ?? 0
    claim(start, start + match[0].length, canonNumber(match[1]), 'day')
  }

  for (const match of text.matchAll(/(\d{1,4}(?:\.\d+)?)/g)) {
    if (/^\d{4}$/.test(match[1]) && Number(match[1]) >= 1900 && Number(match[1]) <= 2099) continue
    const start = match.index ?? 0
    claim(start, start + match[0].length, canonNumber(match[1]), 'number')
  }

  return found
}

function mismatchCode(item: Quantity, others: Quantity[]): FidelityCode {
  const group = family(item.unit)
  const sameValueDifferentUnit = others.some(
    (other) => other.value === item.value && !unitsCompatible(item.unit, other.unit)
  )
  const sameUnitDifferentValue = others.some(
    (other) => unitsCompatible(item.unit, other.unit) && other.value !== item.value
  )
  if (sameValueDifferentUnit && group === 'duration') return 'duration'
  if (sameValueDifferentUnit && group === 'frequency') return 'frequency'
  if (sameValueDifferentUnit) return 'unit'
  if (sameUnitDifferentValue && group === 'frequency') return 'frequency'
  if (sameUnitDifferentValue && group === 'duration') return 'duration'
  if (sameUnitDifferentValue) return 'number'
  if (group === 'frequency') return 'frequency'
  if (group === 'duration') return 'duration'
  if (group === 'unit') return 'unit'
  return 'number'
}

function compareQuantities(source: Quantity[], target: Quantity[]): FidelityFinding[] {
  const used = new Set<number>()
  const unmatchedSource: Quantity[] = []
  for (const item of source) {
    const index = target.findIndex(
      (candidate, candidateIndex) =>
        !used.has(candidateIndex) && candidate.value === item.value && unitsCompatible(item.unit, candidate.unit)
    )
    if (index >= 0) {
      used.add(index)
      continue
    }
    unmatchedSource.push(item)
  }
  const unmatchedTarget = target.filter((_, index) => !used.has(index))
  const findings: FidelityFinding[] = []
  const groups = new Set([...unmatchedSource, ...unmatchedTarget].map((item) => family(item.unit)))
  for (const group of groups) {
    const left = unmatchedSource.filter((item) => family(item.unit) === group)
    const right = unmatchedTarget.filter((item) => family(item.unit) === group)
    if (left.length === 1 && right.length === 1 && left[0].surface && right[0].surface) {
      findings.push({
        severity: 'critical',
        code: mismatchCode(left[0], right),
        detail: `${left[0].value} ${left[0].unit}`,
        sourceFragment: left[0].surface,
        translationFragment: right[0].surface,
      })
      continue
    }
    for (const item of left) {
      findings.push({
        severity: 'critical',
        code: mismatchCode(item, right),
        detail: `${item.value} ${item.unit}`,
        sourceFragment: item.surface,
      })
    }
    for (const item of right) {
      findings.push({
        severity: 'critical',
        code: mismatchCode(item, left),
        detail: `extra ${item.value} ${item.unit}`,
        translationFragment: item.surface,
      })
    }
  }
  return findings
}

function tokenPattern(phrase: string): RegExp {
  const normalized = normalizeProcurementText(phrase).trim()
  if (isCjkText(normalized)) return new RegExp(escapeRegExp(normalized), 'iu')
  const parts = normalized.split(/\s+/).map(escapeRegExp)
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${parts.join('\\s+')}(?=$|[^\\p{L}\\p{N}])`, 'iu')
}

function hasMarker(text: string, marker: string): boolean {
  return tokenPattern(marker).test(normalizeProcurementText(text))
}

function blankUncertainty(text: string): string {
  let blanked = text
  const markers = [...UNCERTAINTY_MARKERS].sort((left, right) => right.length - left.length)
  for (const marker of markers) {
    blanked = blanked.replace(new RegExp(tokenPattern(marker).source, 'giu'), (match) => ' '.repeat(match.length))
  }
  return blanked
}

function negationWindows(text: string): Range[] {
  const windows: Range[] = []
  const used: Range[] = []
  for (const cue of NEGATION_CUES) {
    const re = new RegExp(tokenPattern(cue).source, 'giu')
    for (const match of text.matchAll(re)) {
      const start = match.index ?? 0
      const end = start + match[0].length
      if (overlaps(used, start, end)) continue
      used.push({ start, end })
      const back = Math.max(0, start - 50)
      const punct = Math.max(
        text.lastIndexOf('.', start),
        text.lastIndexOf('!', start),
        text.lastIndexOf('?', start),
        text.lastIndexOf(';', start)
      )
      const from = Math.max(back, punct + 1)
      let to = Math.min(text.length, end + 80)
      for (const mark of ['.', '!', '?', ';']) {
        const at = text.indexOf(mark, end)
        if (at >= 0) to = Math.min(to, at)
      }
      windows.push({ start: from, end: to })
    }
  }
  return windows
}

function anchorNegated(text: string, forms: readonly string[]): boolean | null {
  const normalized = normalizeProcurementText(text)
  const windows = negationWindows(blankUncertainty(normalized))
  const spans = forms.flatMap((form) => formSpans(normalized, form))
  if (spans.length === 0) return null
  return spans.every((span) => windows.some((window) => span.start >= window.start && span.start < window.end))
}

function pushUnique(findings: FidelityFinding[], finding: FidelityFinding): void {
  const key = `${finding.severity}:${finding.code}`
  const index = findings.findIndex((item) => `${item.severity}:${item.code}` === key)
  if (index < 0) {
    findings.push(finding)
    return
  }
  const current = findings[index]
  if (!current.sourceFragment && finding.sourceFragment && finding.translationFragment) {
    findings[index] = finding
  }
}

function instrumentIds(text: string): string[] {
  return PROCUREMENT_GLOSSARY.instruments.filter((entry) => entryAppears(text, entry.forms)).map((entry) => entry.id)
}

function incotermHits(text: string): Array<{ id: string; surface: string }> {
  const ranked = [...PROCUREMENT_GLOSSARY.incoterms].sort((left, right) => {
    const span = (entry: GlossaryEntry) => Math.max(...entry.forms.map((form) => form.length))
    return span(right) - span(left)
  })
  let remaining = text
  const hits: Array<{ id: string; surface: string }> = []
  for (const entry of ranked) {
    const surface = matchedForm(remaining, entry.forms)
    if (!surface) continue
    hits.push({ id: entry.id, surface })
    remaining = maskForms(remaining, entry.forms)
  }
  return hits
}

function compareNegation(source: string, translation: string, entries: readonly GlossaryEntry[]): FidelityFinding[] {
  const findings: FidelityFinding[] = []
  for (const entry of entries) {
    const sourceNegated = anchorNegated(source, entry.forms)
    const translationNegated = anchorNegated(translation, entry.forms)
    if (sourceNegated === null || translationNegated === null || sourceNegated === translationNegated) continue
    pushUnique(findings, { severity: 'critical', code: 'negation', detail: entry.id })
  }
  return findings
}

function compareInstruments(source: string, translation: string, priorSources: readonly string[]): FidelityFinding[] {
  const sourceInstruments = new Set(instrumentIds(source))
  const known = new Set([...sourceInstruments, ...priorSources.flatMap((prior) => instrumentIds(prior))])
  const translated = instrumentIds(translation)
  const findings: FidelityFinding[] = []
  for (const id of sourceInstruments) {
    if (!translated.includes(id)) {
      pushUnique(findings, { severity: 'critical', code: 'instrument', detail: `dropped:${id}` })
    }
  }
  for (const id of translated) {
    if (!known.has(id)) pushUnique(findings, { severity: 'critical', code: 'instrument', detail: `invented:${id}` })
  }
  return findings
}

function compareIncoterms(source: string, translation: string, priorSources: readonly string[]): FidelityFinding[] {
  const sourceHits = incotermHits(source)
  const translatedHits = incotermHits(translation)
  const sourceIds = new Set(sourceHits.map((hit) => hit.id))
  const translatedIds = new Set(translatedHits.map((hit) => hit.id))
  const known = new Set([...sourceIds, ...priorSources.flatMap((prior) => incotermHits(prior).map((hit) => hit.id))])
  const findings: FidelityFinding[] = []
  for (const id of sourceIds) {
    if (!translatedIds.has(id)) pushUnique(findings, { severity: 'critical', code: 'incoterm', detail: `dropped:${id}` })
  }
  for (const id of translatedIds) {
    if (!known.has(id)) pushUnique(findings, { severity: 'critical', code: 'incoterm', detail: `invented:${id}` })
  }
  if (sourceHits.length === 1 && translatedHits.length === 1 && sourceHits[0].id !== translatedHits[0].id) {
    pushUnique(findings, {
      severity: 'critical',
      code: 'incoterm',
      detail: `${sourceHits[0].id}->${translatedHits[0].id}`,
      sourceFragment: sourceHits[0].surface,
      translationFragment: translatedHits[0].surface,
    })
  }
  return findings
}

function hasNumericHedge(text: string): boolean {
  const normalized = normalizeProcurementText(text)
  const amount = numberSource()
  const latin = new RegExp(
    `(?:^|[^\\p{L}\\p{N}])(?:около|примерно|approximately|around|about|unos|unas|environ|aproximadamente|cerca de)\\s+${amount}`,
    'iu'
  )
  const cjk = /(?:大约|大概|約)\s*[0-9一二两三兩]/u
  const after = new RegExp(`${amount}\\s*(?:左右|くらい|ぐらい)`, 'iu')
  return latin.test(normalized) || cjk.test(normalized) || after.test(normalized)
}

function matchedForm(text: string, forms: readonly string[]): string | undefined {
  return forms.find((form) => textHasForm(text, form))
}

function singleEntry(text: string, entries: readonly GlossaryEntry[]): { id: string; surface: string } | null {
  const hits = entries.flatMap((entry) => {
    const surface = matchedForm(text, entry.forms)
    return surface ? [{ id: entry.id, surface }] : []
  })
  if (hits.length !== 1) return null
  return hits[0]
}

const AFTER_AWARD = [
  'after award', 'after the award', 'after contract award', 'после присуждения', 'после заключения договора',
  'despues de la adjudicacion', 'apres attribution', 'nach dem zuschlag', 'dopo l aggiudicazione',
  'apos a adjudicacao', '授予后', '落札後', '낙찰 후', 'setelah penetapan', 'sau khi trao thầu',
]
const BEFORE_AWARD = [
  'before award', 'before the award', 'prior to award', 'до присуждения', 'до заключения договора',
  'antes de la adjudicacion', 'avant attribution', 'vor dem zuschlag', 'prima dell aggiudicazione',
  'antes da adjudicacao', '授予前', '落札前', '낙찰 전', 'sebelum penetapan', 'trước khi trao thầu',
]

const AFTER_ORDER = [
  'after receiving the purchase order', 'after the purchase order', 'after receiving the order', 'after the order',
  'после получения заказа', 'после заказа',
  'despues de recibir el pedido', 'despues del pedido',
  'apres reception de la commande', 'apres la commande',
  'nach eingang der bestellung', 'nach der bestellung',
  'dopo aver ricevuto l ordine', 'dopo l ordine',
  'apos receber o pedido', 'apos o pedido',
  '订单后', '受注後',
]
const BEFORE_ORDER = [
  'before receiving the purchase order', 'before the purchase order', 'prior to the order', 'before the order',
  'до получения заказа', 'перед заказом', 'до заказа',
  'antes de recibir el pedido', 'antes del pedido',
  'avant reception de la commande', 'avant la commande',
  'vor eingang der bestellung', 'vor der bestellung',
  'prima di ricevere l ordine', 'prima dell ordine',
  'antes de receber o pedido', 'antes do pedido',
  '订单前', '受注前',
]
const AFTER_DELIVERY = [
  'after the delivery', 'after delivery', 'after shipment',
  'после поставки', 'после доставки', 'после отгрузки',
  'despues de la entrega', 'apres la livraison', 'nach der lieferung', 'dopo la consegna', 'apos a entrega',
  '交货后', '納品後',
]
const BEFORE_DELIVERY = [
  'before the delivery', 'before delivery', 'prior to delivery', 'before shipment',
  'до поставки', 'перед поставкой', 'до доставки', 'до отгрузки',
  'antes de la entrega', 'avant la livraison', 'vor der lieferung', 'prima della consegna', 'antes da entrega',
  '交货前', '納品前',
]
const AFTER_PAYMENT = [
  'after the payment', 'after payment',
  'после оплаты', 'после платежа',
  'despues del pago', 'apres le paiement', 'nach der zahlung', 'dopo il pagamento', 'apos o pagamento',
  '付款后',
]
const BEFORE_PAYMENT = [
  'before the payment', 'before payment', 'prior to payment',
  'до оплаты', 'перед оплатой', 'до платежа',
  'antes del pago', 'avant le paiement', 'vor der zahlung', 'prima del pagamento', 'antes do pagamento',
  '付款前',
]

const RELATION_ANCHORS: Array<{
  id: string
  severity: 'critical' | 'important'
  after: readonly string[]
  before: readonly string[]
}> = [
  { id: 'award', severity: 'important', after: AFTER_AWARD, before: BEFORE_AWARD },
  { id: 'order', severity: 'critical', after: AFTER_ORDER, before: BEFORE_ORDER },
  { id: 'delivery', severity: 'critical', after: AFTER_DELIVERY, before: BEFORE_DELIVERY },
  { id: 'payment', severity: 'critical', after: AFTER_PAYMENT, before: BEFORE_PAYMENT },
]

const PRICE_ANCHORS = [
  'price', 'precio', 'prix', 'preis', 'prezzo', 'preco',
  'цена', 'цене', 'цену', 'цены', 'ценой', 'стоимост', '价格', '価格',
]

function hasCommercialAnchor(text: string): boolean {
  if (instrumentIds(text).length > 0) return true
  if (incotermHits(text).length > 0) return true
  if (extractQuantities(text).some((item) => family(item.unit) === 'unit')) return true
  return PRICE_ANCHORS.some((form) => textHasForm(text, form))
}

function pricePolarity(text: string): 'included' | 'excluded' | null {
  const included = PROCUREMENT_GLOSSARY.basis.find((entry) => entry.id === 'included')
  const excluded = PROCUREMENT_GLOSSARY.basis.find((entry) => entry.id === 'excluded')
  if (!included || !excluded) return null
  if (entryAppears(text, excluded.forms)) return 'excluded'
  if (entryAppears(text, included.forms)) return 'included'
  return null
}

function compareCommercial(source: string, translation: string): FidelityFinding[] {
  const findings: FidelityFinding[] = []
  const sourceParty = singleEntry(source, PROCUREMENT_GLOSSARY.parties)
  const translatedParty = singleEntry(translation, PROCUREMENT_GLOSSARY.parties)
  if (sourceParty && translatedParty && sourceParty.id !== translatedParty.id) {
    findings.push({
      severity: 'critical',
      code: 'party',
      detail: `${sourceParty.id}->${translatedParty.id}`,
      sourceFragment: sourceParty.surface,
      translationFragment: translatedParty.surface,
    })
  }

  const sourceDocument = singleEntry(source, PROCUREMENT_GLOSSARY.documents)
  const translatedDocument = singleEntry(translation, PROCUREMENT_GLOSSARY.documents)
  if (sourceDocument && translatedDocument && sourceDocument.id !== translatedDocument.id) {
    findings.push({
      severity: 'critical',
      code: 'document',
      detail: `${sourceDocument.id}->${translatedDocument.id}`,
      sourceFragment: sourceDocument.surface,
      translationFragment: translatedDocument.surface,
    })
  }

  const contract = PROCUREMENT_GLOSSARY.documents.find((entry) => entry.id === 'contract')
  const contractor = PROCUREMENT_GLOSSARY.parties.find((entry) => entry.id === 'contractor')
  if (contract && contractor) {
    const sourceContract = entryAppears(source, contract.forms)
    const translatedContract = entryAppears(translation, contract.forms)
    const sourceContractor = entryAppears(source, contractor.forms)
    const translatedContractor = entryAppears(translation, contractor.forms)
    if (sourceContract !== translatedContract && sourceContractor !== translatedContractor && sourceContract === translatedContractor) {
      findings.push({
        severity: 'critical',
        code: 'document',
        detail: 'contract-contractor',
      })
    }
  }

  const anchor = hasCommercialAnchor(source) || hasCommercialAnchor(translation)
  const sourcePolarity = pricePolarity(source)
  const translatedPolarity = pricePolarity(translation)
  if (anchor && sourcePolarity && translatedPolarity && sourcePolarity !== translatedPolarity) {
    const included = PROCUREMENT_GLOSSARY.basis.find((entry) => entry.id === 'included')
    const excluded = PROCUREMENT_GLOSSARY.basis.find((entry) => entry.id === 'excluded')
    const sourceForms = sourcePolarity === 'excluded' ? excluded?.forms ?? [] : included?.forms ?? []
    const translatedForms = translatedPolarity === 'excluded' ? excluded?.forms ?? [] : included?.forms ?? []
    findings.push({
      severity: 'critical',
      code: 'basis',
      detail: `${sourcePolarity}->${translatedPolarity}`,
      sourceFragment: matchedForm(source, sourceForms),
      translationFragment: matchedForm(translation, translatedForms),
    })
  }

  const otherBasis = PROCUREMENT_GLOSSARY.basis.filter((entry) => entry.id !== 'included' && entry.id !== 'excluded')
  const sourceBasis = singleEntry(source, otherBasis)
  const translatedBasis = singleEntry(translation, otherBasis)
  if (anchor && sourceBasis && translatedBasis && sourceBasis.id !== translatedBasis.id) {
    findings.push({
      severity: 'critical',
      code: 'basis',
      detail: `${sourceBasis.id}->${translatedBasis.id}`,
      sourceFragment: sourceBasis.surface,
      translationFragment: translatedBasis.surface,
    })
  }

  for (const anchor of RELATION_ANCHORS) {
    const sourcePole = relationPole(source, anchor.after, anchor.before)
    const translatedPole = relationPole(translation, anchor.after, anchor.before)
    if (!sourcePole || !translatedPole || sourcePole.pole === translatedPole.pole) continue
    findings.push({
      severity: anchor.severity,
      code: 'relation',
      detail: `${anchor.id}:${sourcePole.pole}->${translatedPole.pole}`,
      sourceFragment: sourcePole.surface,
      translationFragment: translatedPole.surface,
    })
  }
  return findings
}

function relationPole(
  text: string,
  after: readonly string[],
  before: readonly string[]
): { pole: 'after' | 'before'; surface: string } | null {
  const afterSurface = matchedForm(text, after)
  const beforeSurface = matchedForm(text, before)
  if (afterSurface && !beforeSurface) return { pole: 'after', surface: afterSurface }
  if (beforeSurface && !afterSurface) return { pole: 'before', surface: beforeSurface }
  return null
}

const CURRENCIES = new Set(['usd', 'eur', 'gbp', 'cny', 'rub'])
const REDUCE_FORMS = [
  'сниз', 'скидк', 'уменьш', 'reduce', 'discount', 'lower', 'decrease',
  'reducir', 'descuento', 'reduire', 'remise', 'senken', 'rabatt', '降低', '减少',
]
const INCREASE_FORMS = [
  'увелич', 'повыс', 'наценк', 'increase', 'raise', 'surcharge',
  'aumentar', 'augmenter', 'erhöhen', '提高', '增加',
]

function currencyAmounts(text: string): Quantity[] {
  return extractQuantities(text).filter((item) => CURRENCIES.has(item.unit))
}

function percentAmount(text: string): Quantity | null {
  const items = extractQuantities(text).filter((item) => item.unit === 'percent')
  return items.length === 1 ? items[0] : null
}

function priceDirection(text: string): 'reduce' | 'increase' | null {
  const reduce = REDUCE_FORMS.some((form) => textHasForm(text, form))
  const increase = INCREASE_FORMS.some((form) => textHasForm(text, form))
  if (reduce === increase) return null
  return reduce ? 'reduce' : 'increase'
}

function lastSingle(priorSources: readonly string[], pick: (text: string) => Quantity | null): Quantity | null {
  for (let index = priorSources.length - 1; index >= 0; index -= 1) {
    const item = pick(priorSources[index])
    if (item) return item
  }
  return null
}

function singleCurrency(text: string): Quantity | null {
  const amounts = currencyAmounts(text)
  return amounts.length === 1 ? amounts[0] : null
}

function leadTimes(text: string): Quantity[] {
  return extractQuantities(text).filter((item) => {
    if (item.unit.endsWith('_ago') || item.unit === 'minute') return false
    return family(item.unit) === 'duration'
  })
}

function singleLead(text: string): Quantity | null {
  const items = leadTimes(text)
  return items.length === 1 ? items[0] : null
}

function explicitBasis(text: string): { id: string; surface: string } | null {
  const polarity = pricePolarity(text)
  if (polarity) {
    const entry = PROCUREMENT_GLOSSARY.basis.find((item) => item.id === polarity)
    return { id: polarity, surface: (entry && matchedForm(text, entry.forms)) || polarity }
  }
  return singleEntry(text, PROCUREMENT_GLOSSARY.basis.filter((entry) => entry.id !== 'included' && entry.id !== 'excluded'))
}

function pricesClose(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= Math.max(0.05, Math.abs(expected) * 0.001)
}

function applyNegotiationMemory(
  findings: FidelityFinding[],
  source: string,
  translation: string,
  priorSources: readonly string[]
): FidelityFinding[] {
  return applyDeadlineMemory(
    applyBasisMemory(applyPriceMemory(findings, source, translation, priorSources), source, translation, priorSources),
    source,
    translation,
    priorSources
  )
}

function applyPriceMemory(
  findings: FidelityFinding[],
  source: string,
  translation: string,
  priorSources: readonly string[]
): FidelityFinding[] {
  const price = lastSingle(priorSources, singleCurrency)
  const direction = priceDirection(source)
  const percent = percentAmount(source)
  if (!price || !direction || !percent || currencyAmounts(source).length > 0) return findings
  const percentValue = Number(percent.value)
  const base = Number(price.value)
  if (!Number.isFinite(percentValue) || !Number.isFinite(base)) return findings
  const expected = direction === 'reduce' ? base * (1 - percentValue / 100) : base * (1 + percentValue / 100)
  const translatedCurrency = currencyAmounts(translation)
  const translatedPercent = percentAmount(translation)
  const samePercent = translatedPercent?.value === percent.value && priceDirection(translation) === direction
  const statesExpected = translatedCurrency.length === 1 && pricesClose(Number(translatedCurrency[0].value), expected)
  const noise = (finding: FidelityFinding) => {
    if (finding.code !== 'number' && finding.code !== 'unit') return false
    if (finding.detail === `${percent.value} percent`) return true
    return translatedCurrency.some((item) => finding.detail === `extra ${item.value} ${item.unit}`)
  }
  if (statesExpected || (samePercent && translatedCurrency.length === 0)) {
    return findings.filter((finding) => !noise(finding))
  }
  if (translatedCurrency.length !== 1) return findings
  return [
    ...findings.filter((finding) => !noise(finding)),
    {
      severity: 'critical',
      code: 'number',
      detail: `${direction} ${percent.value} -> ${expected} ${price.unit}`,
      sourceFragment: percent.surface,
      translationFragment: translatedCurrency[0].surface,
    },
  ]
}

function applyBasisMemory(
  findings: FidelityFinding[],
  source: string,
  translation: string,
  priorSources: readonly string[]
): FidelityFinding[] {
  if (explicitBasis(source)) return findings
  const translated = explicitBasis(translation)
  if (!translated) return findings
  let remembered: { id: string; surface: string } | null = null
  for (let index = priorSources.length - 1; index >= 0; index -= 1) {
    remembered = explicitBasis(priorSources[index])
    if (remembered) break
  }
  if (!remembered || remembered.id === translated.id) return findings
  return [
    ...findings,
    {
      severity: 'critical',
      code: 'basis',
      detail: `${remembered.id}->${translated.id}`,
      sourceFragment: remembered.surface,
      translationFragment: translated.surface,
    },
  ]
}

function applyDeadlineMemory(
  findings: FidelityFinding[],
  source: string,
  translation: string,
  priorSources: readonly string[]
): FidelityFinding[] {
  if (leadTimes(source).length > 0) return findings
  const translated = singleLead(translation)
  if (!translated) return findings
  const remembered = lastSingle(priorSources, singleLead)
  if (!remembered) return findings
  const same = translated.value === remembered.value && unitsCompatible(remembered.unit, translated.unit)
  const extraDetail = `extra ${translated.value} ${translated.unit}`
  if (same) return findings.filter((finding) => finding.detail !== extraDetail)
  return [
    ...findings.filter((finding) => finding.detail !== extraDetail),
    {
      severity: 'critical',
      code: 'duration',
      detail: `${remembered.value} ${remembered.unit}->${translated.value} ${translated.unit}`,
      sourceFragment: remembered.surface,
      translationFragment: translated.surface,
    },
  ]
}

function uncertain(text: string): boolean {
  return hasNumericHedge(text) || UNCERTAINTY_MARKERS.some((marker) => hasMarker(text, marker))
}

export function assessProcurementFidelity(input: ProcurementFidelityInput): ProcurementFidelityReport {
  const source = input.source.trim()
  const translation = input.translation.trim()
  if (!source || !translation) return { findings: [] }

  const priorSources = input.priorSources ?? []
  const findings: FidelityFinding[] = []

  for (const finding of compareQuantities(extractQuantities(source), extractQuantities(translation))) {
    pushUnique(findings, finding)
  }
  for (const finding of compareNegation(source, translation, [
    ...PROCUREMENT_GLOSSARY.instruments,
    ...PROCUREMENT_GLOSSARY.terms,
    ...PROCUREMENT_GLOSSARY.incoterms,
  ])) {
    pushUnique(findings, finding)
  }
  for (const finding of compareInstruments(source, translation, priorSources)) {
    pushUnique(findings, finding)
  }
  for (const finding of compareIncoterms(source, translation, priorSources)) {
    pushUnique(findings, finding)
  }

  if (uncertain(source) !== uncertain(translation)) {
    pushUnique(findings, {
      severity: 'important',
      code: 'uncertainty',
      detail: uncertain(source) ? 'dropped' : 'added',
    })
  }

  for (const entry of PROCUREMENT_GLOSSARY.terms) {
    if (!entryAppears(source, entry.forms) || entryAppears(translation, entry.forms)) continue
    pushUnique(findings, { severity: 'important', code: 'term', detail: entry.id })
  }

  for (const entry of PROCUREMENT_GLOSSARY.abbreviations) {
    if (entry.ambiguous) {
      const sourceHasShort = entry.forms.some((form) => form.length <= 4 && hasMarker(source, form))
      const sourceExpanded = (entry.expansions ?? []).some((form) => textHasForm(source, form))
      const translationExpanded = (entry.expansions ?? []).some((form) => textHasForm(translation, form))
      if (sourceHasShort && !sourceExpanded && translationExpanded) {
        pushUnique(findings, { severity: 'important', code: 'abbreviation', detail: entry.id })
      }
      continue
    }
    const sourceHasShort = entry.forms.some((form) => form.length <= 4 && hasMarker(source, form))
    if (!sourceHasShort || entryAppears(translation, entry.forms)) continue
    pushUnique(findings, { severity: 'important', code: 'abbreviation', detail: entry.id })
  }

  for (const finding of compareCommercial(source, translation)) {
    pushUnique(findings, finding)
  }

  return { findings: applyNegotiationMemory(findings, source, translation, priorSources) }
}
