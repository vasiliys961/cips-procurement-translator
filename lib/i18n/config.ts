export const SUPPORTED_LOCALES = [
  'ru',
  'en',
  'es',
  'fr',
  'ar',
  'hi',
  'pt-BR',
  'id',
  'ms',
  'tr',
  'zh-CN',
] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  hi: 'हिन्दी',
  'pt-BR': 'Português',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tr: 'Türkçe',
  'zh-CN': '中文',
}
