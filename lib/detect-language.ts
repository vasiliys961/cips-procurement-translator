import { findTranslatorLanguage, type TranslatorLanguage } from './realtime-translate'

const WHISPER_LANGUAGE_CODES: Record<string, string> = {
  russian: 'ru',
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  hindi: 'hi',
  indonesian: 'id',
  vietnamese: 'vi',
  arabic: 'ar',
  turkish: 'tr',
  ukrainian: 'uk',
  malay: 'ms',
  polish: 'pl',
}

export function languageFromWhisperName(name: string): TranslatorLanguage | null {
  const code = WHISPER_LANGUAGE_CODES[name.trim().toLowerCase()]
  if (!code) return null
  return findTranslatorLanguage(code) ?? null
}
