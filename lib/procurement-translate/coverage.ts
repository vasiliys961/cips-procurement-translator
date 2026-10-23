/** Small catalogue shared with the UI; do not bundle the full glossary there. */
export const PROCUREMENT_LANGUAGES: readonly string[] = ['en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'nl', 'ro', 'cs']

export function hasProcurementGlossary(code: string): boolean {
  return PROCUREMENT_LANGUAGES.includes(code)
}
