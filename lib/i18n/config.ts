export const LEGACY_LOCALES = [
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

export type LegacyLocale = (typeof LEGACY_LOCALES)[number]

export const SUPPORTED_LOCALES = [
  ...LEGACY_LOCALES,
  'bg', 'hr', 'cs', 'da', 'nl', 'et', 'fi', 'de', 'el', 'hu', 'ga',
  'it', 'lv', 'lt', 'mt', 'pl', 'pt-PT', 'ro', 'sk', 'sl', 'sv',
] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
  hi: 'हिन्दी',
  'pt-BR': 'Português (Brasil)',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  tr: 'Türkçe',
  'zh-CN': '中文',
  bg: 'Български', hr: 'Hrvatski', cs: 'Čeština', da: 'Dansk', nl: 'Nederlands',
  et: 'Eesti', fi: 'Suomi', de: 'Deutsch', el: 'Ελληνικά', hu: 'Magyar', ga: 'Gaeilge',
  it: 'Italiano', lv: 'Latviešu', lt: 'Lietuvių', mt: 'Malti', pl: 'Polski',
  'pt-PT': 'Português (Portugal)', ro: 'Română', sk: 'Slovenčina', sl: 'Slovenščina', sv: 'Svenska',
}
