export type LiveLanguage = {
  code: string
  nativeName: string
  englishName: string
  eu?: boolean
  experimental?: boolean
}

// Standard Realtime speech model catalogue, separate from the dedicated
// gpt-realtime-translate model's smaller output-language allowlist.
export const LIVE_DIALOGUE_LANGUAGES: readonly LiveLanguage[] = [
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'en', nativeName: 'English', englishName: 'English', eu: true },
  { code: 'bg', nativeName: 'Български', englishName: 'Bulgarian', eu: true },
  { code: 'hr', nativeName: 'Hrvatski', englishName: 'Croatian', eu: true },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech', eu: true },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish', eu: true },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch', eu: true },
  { code: 'et', nativeName: 'Eesti', englishName: 'Estonian', eu: true },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish', eu: true },
  { code: 'fr', nativeName: 'Français', englishName: 'French', eu: true },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', eu: true },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek', eu: true },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian', eu: true },
  { code: 'ga', nativeName: 'Gaeilge', englishName: 'Irish', eu: true, experimental: true },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', eu: true },
  { code: 'lv', nativeName: 'Latviešu', englishName: 'Latvian', eu: true },
  { code: 'lt', nativeName: 'Lietuvių', englishName: 'Lithuanian', eu: true },
  { code: 'mt', nativeName: 'Malti', englishName: 'Maltese', eu: true, experimental: true },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish', eu: true },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', eu: true },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian', eu: true },
  { code: 'sk', nativeName: 'Slovenčina', englishName: 'Slovak', eu: true },
  { code: 'sl', nativeName: 'Slovenščina', englishName: 'Slovenian', eu: true },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', eu: true },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', eu: true },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish' },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese' },
]

export function findLiveLanguage(code: string): LiveLanguage | undefined {
  return LIVE_DIALOGUE_LANGUAGES.find(language => language.code === code)
}

export function validLivePair(first: string, second: string): boolean {
  return first !== second && Boolean(findLiveLanguage(first) && findLiveLanguage(second))
}

export function liveLanguageLabel(code: string, locale: string): string {
  const language = findLiveLanguage(code)
  if (!language) return code
  try { return new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? language.nativeName }
  catch { return language.nativeName }
}
