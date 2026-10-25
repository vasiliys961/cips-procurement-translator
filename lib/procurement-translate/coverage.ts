/** Small catalogue shared with the UI; do not bundle the full glossary there. */
export const PROCUREMENT_LANGUAGES: readonly string[] = [
  'en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'nl', 'ro', 'cs',
  'bg', 'hr', 'da', 'el', 'et', 'fi', 'hu', 'ga', 'lv', 'lt', 'mt', 'sk', 'sl', 'sv',
]

export function hasProcurementGlossary(code: string): boolean {
  return PROCUREMENT_LANGUAGES.includes(code)
}
