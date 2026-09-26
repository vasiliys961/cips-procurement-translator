export const REALTIME_TRANSLATE_USD_PER_MINUTE = 0.034
export const REALTIME_WHISPER_USD_PER_MINUTE = 0.017

const PRICE_MULTIPLIER = 100

export const REALTIME_TRANSLATION_CREDITS_PER_MINUTE =
  (REALTIME_TRANSLATE_USD_PER_MINUTE + REALTIME_WHISPER_USD_PER_MINUTE) * PRICE_MULTIPLIER

export function realtimeTranslationCredits(seconds: number): number {
  const safeSeconds = Math.max(0, Number(seconds) || 0)
  return Math.round((safeSeconds / 60) * REALTIME_TRANSLATION_CREDITS_PER_MINUTE * 100) / 100
}
