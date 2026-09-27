import type { FidelityCode, FidelityFinding, ProcurementFidelityReport } from './fidelity'

const MAX_FRAGMENT = 48

export type FidelityDisplayLine = {
  severity: 'critical' | 'important'
  code: FidelityCode
  sourceFragment?: string
  translationFragment?: string
}

function cleanFragment(value: string | undefined): string | undefined {
  if (!value) return undefined
  const text = value.replace(/\s+/g, ' ').trim()
  if (!text || text.length > MAX_FRAGMENT) return undefined
  return text
}

export function fidelityDisplayLines(report: ProcurementFidelityReport | null | undefined): FidelityDisplayLine[] {
  if (!report) return []
  return report.findings.map((finding) => lineFromFinding(finding))
}

function lineFromFinding(finding: FidelityFinding): FidelityDisplayLine {
  return {
    severity: finding.severity,
    code: finding.code,
    sourceFragment: cleanFragment(finding.sourceFragment),
    translationFragment: cleanFragment(finding.translationFragment),
  }
}

export function fidelityLineText(title: string, sourceFragment?: string, translationFragment?: string): string {
  if (sourceFragment && translationFragment) return `${title}: ${sourceFragment} ↔ ${translationFragment}`
  if (sourceFragment) return `${title}: ${sourceFragment}`
  if (translationFragment) return `${title}: ${translationFragment}`
  return title
}

export function reportForTurn<T>(report: T | null, reportTurn: number, activeTurn: number): T | null {
  if (reportTurn !== activeTurn) return null
  return report
}
