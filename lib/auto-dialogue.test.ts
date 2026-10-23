import { describe, expect, it } from 'vitest'
import { ambiguousUtterance, dialogueTarget, encodeWav, SpeechBoundary } from './auto-dialogue'

describe('automatic dialogue direction', () => {
  it('routes by language, including consecutive turns by the same speaker', () => {
    expect(['ru', 'ru', 'en', 'en', 'ru'].map(code => dialogueTarget(code, 'ru', 'en')))
      .toEqual(['en', 'en', 'ru', 'ru', 'en'])
  })
  it('rejects third languages, equal pairs, and unsupported voice targets', () => {
    expect(dialogueTarget('fr', 'ru', 'en')).toBeNull()
    expect(dialogueTarget('ru', 'ru', 'ru')).toBeNull()
    expect(dialogueTarget('ru', 'ru', 'ar')).toBeNull()
  })
  it('does not choose direction for numbers or shared abbreviations', () => {
    for (const text of ['123.50', 'OK!', 'CIP', 'Да.', 'no']) expect(ambiguousUtterance(text)).toBe(true)
    expect(ambiguousUtterance('Цена включает доставку.')).toBe(false)
  })
})

describe('speech boundary', () => {
  it('keeps listening through silence and dismisses a short click', () => {
    const vad = new SpeechBoundary()
    expect(vad.update(0, 0)).toBe('waiting')
    expect(vad.update(0.1, 50)).toBe('speaking')
    expect(vad.update(0, 1100)).toBe('waiting')
    expect(vad.update(0, 5000)).toBe('waiting')
  })
  it('ends a real phrase after silence, not after a short hesitation', () => {
    const vad = new SpeechBoundary()
    for (let now = 0; now <= 500; now += 50) vad.update(0.1, now)
    expect(vad.update(0, 1000)).toBe('speaking')
    expect(vad.update(0.1, 1100)).toBe('speaking')
    expect(vad.update(0, 2100)).toBe('done')
  })
  it('caps continuous speech at twenty seconds', () => {
    const vad = new SpeechBoundary()
    for (let now = 0; now < 20_000; now += 50) vad.update(0.1, now)
    expect(vad.update(0.1, 20_000)).toBe('done')
  })
})

it('encodes a mono PCM WAV with a valid sample rate and clipped samples', async () => {
  const blob = encodeWav(new Float32Array([-2, 0, 2]), 16000)
  const view = new DataView(await blob.arrayBuffer())
  expect(blob.type).toBe('audio/wav')
  expect(view.byteLength).toBe(50)
  expect(view.getUint32(24, true)).toBe(16000)
  expect(view.getUint32(40, true)).toBe(6)
  expect(view.getInt16(44, true)).toBe(-32767)
  expect(view.getInt16(48, true)).toBe(32767)
})
