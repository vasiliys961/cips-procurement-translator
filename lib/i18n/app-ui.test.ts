import { expect, it } from 'vitest'
import { appUi, formatUi } from './app-ui'
import { SUPPORTED_LOCALES, LOCALE_LABELS, isLocale } from './config'
import { translatorUi, partyLabels } from './translator-ui'
import { callUi } from './call-ui'

function strings(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  return Object.fromEntries(Object.entries(value as object).flatMap(([key, nested]) => Object.entries(strings(nested, prefix + '.' + key))))
}
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort()

it('provides complete dictionaries and preserves placeholders for every selectable UI locale', () => {
  expect(SUPPORTED_LOCALES).toHaveLength(32)
  for (const locale of SUPPORTED_LOCALES) {
    expect(LOCALE_LABELS[locale]).toBeTruthy()
    expect(partyLabels[locale].you).toBeTruthy()
    for (const catalogue of [appUi, translatorUi, callUi]) {
      const source = strings(catalogue.en)
      const localized = strings(catalogue[locale])
      expect(Object.keys(localized).sort()).toEqual(Object.keys(source).sort())
      for (const [key, text] of Object.entries(source)) {
        expect(localized[key].trim(), `${locale}${key}`).not.toBe('')
        expect(placeholders(localized[key]), `${locale}${key}`).toEqual(placeholders(text))
      }
    }
  }
})

it('does not fall back to English on the German, French, Polish or Italian live screen', () => {
  for (const locale of ['de', 'fr', 'pl', 'it'] as const) {
    expect(appUi[locale].common.interfaceLanguage).not.toBe(appUi.en.common.interfaceLanguage)
    expect(appUi[locale].live.description).not.toBe(appUi.en.live.description)
    expect(appUi[locale].live.phase.listening).not.toBe(appUi.en.live.phase.listening)
  }
  expect(isLocale('de')).toBe(true)
  expect(isLocale('unknown')).toBe(false)
  expect(formatUi(appUi.de.live.languageLabel, { number: 2 })).toContain('2')
})
