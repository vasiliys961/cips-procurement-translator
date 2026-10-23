import { expect, it } from 'vitest'
import { LIVE_DIALOGUE_LANGUAGES, liveLanguageLabel, validLivePair } from './live-languages'
import { dialogueRealtimeSession } from './dialogue-realtime-session'
import { findTranslatorLanguage } from './realtime-translate'

it('lists all 24 EU languages and marks the two unverified languages experimental', () => {
  const eu = LIVE_DIALOGUE_LANGUAGES.filter(language => language.eu)
  expect(eu).toHaveLength(24)
  expect(eu.filter(language => language.experimental).map(language => language.code).sort()).toEqual(['ga', 'mt'])
  expect(new Set(LIVE_DIALOGUE_LANGUAGES.map(language => language.code)).size).toBe(35)
})

it('creates both directions of every distinct pair without the dedicated translator output cap', () => {
  let pairs = 0
  for (const first of LIVE_DIALOGUE_LANGUAGES) for (const second of LIVE_DIALOGUE_LANGUAGES) {
    if (first.code === second.code) {
      expect(validLivePair(first.code, second.code)).toBe(false)
      continue
    }
    expect(validLivePair(first.code, second.code)).toBe(true)
    const session = dialogueRealtimeSession(first.code, second.code)
    expect(session.instructions).toContain(`${first.englishName} speech must become ${second.englishName}`)
    expect(session.instructions).toContain(`${second.englishName} speech must become ${first.englishName}`)
    expect(session.audio.input.turn_detection.silence_duration_ms).toBe(300)
    pairs++
  }
  expect(pairs).toBe(35 * 34)
  expect(findTranslatorLanguage('pl')?.outputCode).toBeNull()
  expect(validLivePair('xx', 'en')).toBe(false)
})

it('keeps pair instructions independent of the UI language and localizes the displayed labels', () => {
  const session = dialogueRealtimeSession('de', 'pl')
  expect(session.instructions).not.toContain('Russian')
  expect(session.instructions).toContain('German speech must become Polish')
  expect(liveLanguageLabel('de', 'de')).not.toEqual(liveLanguageLabel('de', 'en'))
  expect(liveLanguageLabel('pl', 'pl')).not.toEqual(liveLanguageLabel('pl', 'ru'))
})
