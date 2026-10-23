import { expect, it } from 'vitest'
import { dialogueRealtimeSession } from '../dialogue-realtime-session'
import { NEGOTIATION_GLOSSARY, PROCUREMENT_LANGUAGES, procurementPairGlossary } from './negotiation-glossary'

it('covers 35 commercial concepts in all eleven initial languages', () => {
  expect(NEGOTIATION_GLOSSARY).toHaveLength(35)
  expect(PROCUREMENT_LANGUAGES).toEqual(['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'nl', 'ro', 'cs'])
  expect(new Set(NEGOTIATION_GLOSSARY.map(entry => entry.id)).size).toBe(35)
  for (const entry of NEGOTIATION_GLOSSARY) {
    expect(Object.keys(entry.terms)).toEqual(PROCUREMENT_LANGUAGES)
    expect(Object.values(entry.terms).every(term => term.trim().length > 2)).toBe(true)
  }
})

it('attaches only the two selected language columns in both directions', () => {
  for (const first of PROCUREMENT_LANGUAGES) for (const second of PROCUREMENT_LANGUAGES) {
    if (first === second) continue
    const session = dialogueRealtimeSession(first, second)
    const glossary = procurementPairGlossary(first, second)
    for (const entry of NEGOTIATION_GLOSSARY) {
      const terms = entry.terms as Record<string, string>
      expect(glossary).toContain(`${first}=${terms[first]} <=> ${second}=${terms[second]}`)
    }
    for (const excluded of PROCUREMENT_LANGUAGES.filter(code => code !== first && code !== second)) {
      expect(glossary).not.toContain(`${excluded}=`)
    }
    expect(session.instructions).toContain(glossary)
    expect(session.instructions.length).toBeLessThan(12_000)
    expect(session.audio.input.turn_detection.silence_duration_ms).toBe(300)
  }
})

it('handles partial and absent coverage without restricting other language pairs', () => {
  expect(procurementPairGlossary('sv', 'fi')).toBe('')
  expect(procurementPairGlossary('sv', 'de')).toContain('de=Dokumentenakkreditiv')
  expect(procurementPairGlossary('sv', 'de')).not.toContain('en=')
  expect(dialogueRealtimeSession('sv', 'fi').instructions).toContain('procurement conversation')
})

it('distinguishes ambiguous commercial concepts without inventing contract details', () => {
  const glossary = procurementPairGlossary('en', 'it')
  expect(glossary).toContain('credito documentario / lettera di credito')
  expect(glossary).not.toContain('carta di credito')
  expect(glossary).toContain('not a credit card')
  expect(glossary).toContain('not a calendar delivery date')
  expect(glossary).toContain('do not assume a bank guarantee')
  expect(glossary).toContain('Keep LC, PR and CIP unexpanded')
  expect(glossary).toContain('do not add a tax rate')
  expect(glossary).toContain('MUST stay the same letters')
  expect(glossary).toContain('NOT payment within 14 days')
  expect(glossary).toContain('Do not add a parenthetical acronym')
  expect(glossary).toContain('not just an unspecified amount')
  expect(glossary).toContain('NOT a complaint or claim')
})
