import { findTranslatorLanguage } from './realtime-translate'

export const MAX_UTTERANCE_MS = 20_000
export const MAX_AUDIO_BYTES = 6 * 1024 * 1024
export const END_SILENCE_MS = 650

export function dialogueTarget(source: string, first: string, second: string): string | null {
  if (first === second || !findTranslatorLanguage(first)?.outputCode || !findTranslatorLanguage(second)?.outputCode) return null
  return source === first ? second : source === second ? first : null
}

/** Language guesses for numbers, names and shared acknowledgements must not change direction. */
export function ambiguousUtterance(text: string): boolean {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  if (!words.length) return true
  return /^(ok|okay|ок|окей|okay thanks|cips|cip|rfq|rfp|moq|hello|hi|да|нет|yes|no)$/iu.test(text.trim().replace(/[.!?,]+$/u, ''))
}

/** Local energy VAD. Keep audio separately before onset; never use silence to alternate languages. */
export class SpeechBoundary {
  private startedAt: number | null = null
  private lastVoiceAt = 0
  private voicedMs = 0
  private previousAt: number | null = null

  update(rms: number, now: number): 'waiting' | 'speaking' | 'done' {
    const elapsed = this.previousAt === null ? 0 : Math.min(100, Math.max(0, now - this.previousAt))
    this.previousAt = now
    if (rms >= 0.018) {
      this.startedAt ??= now
      this.lastVoiceAt = now
      this.voicedMs += elapsed
    }
    if (this.startedAt === null) return 'waiting'
    if (now - this.startedAt >= MAX_UTTERANCE_MS) return 'done'
    if (now - this.lastVoiceAt >= END_SILENCE_MS) {
      if (this.voicedMs >= 250) return 'done'
      this.startedAt = null
      this.voicedMs = 0
      return 'waiting'
    }
    return 'speaking'
  }
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(bytes)
  const text = (at: number, value: string) => [...value].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVE')
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true)
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples.length * 2, true)
  samples.forEach((value, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, value)) * 0x7fff), true))
  return new Blob([bytes], { type: 'audio/wav' })
}
