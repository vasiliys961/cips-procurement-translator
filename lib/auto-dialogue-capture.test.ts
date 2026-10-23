import { afterEach, describe, expect, it, vi } from 'vitest'
import { DialogueMicrophone } from './auto-dialogue-capture'

afterEach(() => vi.unstubAllGlobals())

function setup(getStream?: () => Promise<unknown>) {
  const track = { enabled: true, onended: null, stop: vi.fn() }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  const port = { onmessage: null as null | ((event: { data: Float32Array }) => void) }
  const close = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: getStream ?? vi.fn().mockResolvedValue(stream) } })
  vi.stubGlobal('AudioContext', class {
    sampleRate = 16000
    destination = {}
    audioWorklet = { addModule: vi.fn().mockResolvedValue(undefined) }
    resume = vi.fn().mockResolvedValue(undefined)
    close = close
    createMediaStreamSource = () => ({ connect: vi.fn() })
  })
  vi.stubGlobal('AudioWorkletNode', class { port = port; connect = vi.fn(); disconnect = vi.fn() })
  return { track, stream, port, close }
}

describe('dialogue microphone lifecycle', () => {
  it('captures a phrase once and stops sending audio until playback finishes', async () => {
    const { track, port, close } = setup()
    const audio = vi.fn()
    const mic = new DialogueMicrophone()
    await mic.start(audio, vi.fn(), vi.fn())
    const send = (value: number) => port.onmessage?.({ data: new Float32Array(800).fill(value) })
    for (let i = 0; i < 10; i++) send(0.1)
    for (let i = 0; i < 21; i++) send(0)
    expect(audio).toHaveBeenCalledTimes(1)
    expect(track.enabled).toBe(false)
    for (let i = 0; i < 50; i++) send(0.1)
    expect(audio).toHaveBeenCalledTimes(1)
    mic.resume()
    expect(track.enabled).toBe(true)
    mic.stop()
    expect(track.stop).toHaveBeenCalledTimes(1)
    expect(close).toHaveBeenCalledTimes(1)
    expect(port.onmessage).toBeNull()
  })
  it('releases a microphone granted after the user has already stopped', async () => {
    let grant!: (stream: unknown) => void
    const { track, stream } = setup(() => new Promise(resolve => { grant = resolve }))
    const mic = new DialogueMicrophone()
    const started = mic.start(vi.fn(), vi.fn(), vi.fn())
    await Promise.resolve()
    mic.stop()
    grant(stream)
    await started
    expect(track.stop).toHaveBeenCalledTimes(1)
  })
})
