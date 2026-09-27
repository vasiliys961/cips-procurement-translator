import type { Locale } from './i18n/config'

const SPEECH_TO_UI: Record<string, Locale> = {
  ru: 'ru',
  en: 'en',
  es: 'es',
  fr: 'fr',
  pt: 'pt-BR',
  zh: 'zh-CN',
  hi: 'hi',
  id: 'id',
  ar: 'ar',
  tr: 'tr',
  ms: 'ms',
  uk: 'ru',
}

export function localeForSpeech(code: string): Locale {
  return SPEECH_TO_UI[code] ?? 'en'
}
