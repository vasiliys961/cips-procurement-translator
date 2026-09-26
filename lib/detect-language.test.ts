import { describe, expect, it } from 'vitest'
import { languageFromWhisperName } from './detect-language'

describe('languageFromWhisperName', () => {
  it('maps a spoken language onto the translator list', () => {
    expect(languageFromWhisperName('Russian')?.code).toBe('ru')
    expect(languageFromWhisperName('english')?.outputCode).toBe('en')
  })

  it('returns null for a language the translator does not know', () => {
    expect(languageFromWhisperName('swedish')).toBeNull()
  })
})
