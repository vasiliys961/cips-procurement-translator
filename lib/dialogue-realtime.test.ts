import { afterEach, expect, it, vi } from 'vitest'
import { DialogueRealtime, LiveTurns } from './dialogue-realtime'
import { dialogueRealtimeSession } from './dialogue-realtime-session'

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

it('does not attach a late source transcript to a later speaker', () => {
  const turns = new LiveTurns()
  turns.input('first'); turns.response('response1')
  turns.output('response1', 'Hello', true)
  turns.input('second'); turns.response('response2')
  turns.output('response2', 'Привет', true)
  expect(turns.source('first', 'Здравствуйте')).toMatchObject({ id: 'first', source: 'Здравствуйте', translation: 'Hello', done: true })
  expect(turns.source('second', 'Hello')).toMatchObject({ id: 'second', source: 'Hello', translation: 'Привет' })
})

it('configures automatic responses without a separate ASR/translation/TTS chain', () => {
  const session = dialogueRealtimeSession('ru', 'en')
  expect(session.instructions).toContain('Never answer questions')
  expect(session.instructions).toContain('Never alternate blindly')
  expect(session.audio.input.turn_detection).toMatchObject({ type: 'server_vad', silence_duration_ms: 400, create_response: true, interrupt_response: false })
  expect(() => dialogueRealtimeSession('ru', 'ru')).toThrow('invalid_pair')
})

it('keeps the microphone muted until WebRTC playback actually finishes', async () => {
  vi.useFakeTimers()
  const track = { enabled: true, onended: null, stop: vi.fn() }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  const channel = { readyState: 'connecting', onopen: null as null | (() => void), onclose: null,
    onmessage: null as null | ((event: { data: string }) => void), send: vi.fn(), close: vi.fn() }
  const peer = { connectionState: 'new', onconnectionstatechange: null, ontrack: null,
    createDataChannel: () => channel, addTrack: vi.fn(), createOffer: async () => ({ type: 'offer', sdp: 'v=offer' }),
    localDescription: { sdp: 'v=offer' }, setLocalDescription: vi.fn(), setRemoteDescription: vi.fn(), close: vi.fn() }
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } })
  vi.stubGlobal('RTCPeerConnection', class { constructor() { return peer } })
  vi.stubGlobal('Audio', class {
    src = ''; srcObject = null; autoplay = false
    play = async () => undefined; pause = vi.fn(); setAttribute = vi.fn(); removeAttribute = vi.fn(); load = vi.fn()
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ answerSdp: 'v=answer' })))
  const phase = vi.fn()
  const client = new DialogueRealtime()
  await client.start({ first: 'ru', second: 'en', onPhase: phase, onTurn: vi.fn(), onBlocked: vi.fn(), onError: vi.fn() })
  channel.readyState = 'open'; channel.onopen!()
  expect(track.enabled).toBe(true)
  const event = (value: unknown) => channel.onmessage!({ data: JSON.stringify(value) })
  event({ type: 'input_audio_buffer.speech_started', item_id: 'user1' })
  event({ type: 'response.created', response: { id: 'r1' } })
  event({ type: 'output_audio_buffer.started' })
  expect(track.enabled).toBe(false)
  event({ type: 'response.done', response: { status: 'completed', output: [{ content: [{ type: 'audio' }] }] } })
  await vi.advanceTimersByTimeAsync(500)
  expect(track.enabled).toBe(false)
  event({ type: 'output_audio_buffer.stopped' })
  await vi.advanceTimersByTimeAsync(150)
  expect(track.enabled).toBe(true)
  expect(phase).toHaveBeenLastCalledWith('listening')
  client.stop()
  expect(track.stop).toHaveBeenCalledTimes(1)
  expect(peer.close).toHaveBeenCalledTimes(1)
})
