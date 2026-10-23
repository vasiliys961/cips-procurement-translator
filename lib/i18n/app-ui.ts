import generated from './generated/app-ui.json'
import type { Locale } from './config'

export type AppUi = (typeof generated)['en']
export const appUi: Record<Locale, AppUi> = generated

export function formatUi(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => values[key] === undefined ? placeholder : String(values[key]))
}
