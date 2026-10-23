import { audioDeadline } from './auto-dialogue-capture'
import { encodeWav } from './auto-dialogue'

export type LivePhase = 'connecting' | 'listening' | 'speaking' | 'translating' | 'playing'
export type LiveTurn = { id: string; source: string; translation: string; done: boolean; latencyMs?: number }
type Options = {
  first: string; second: string
  onPhase: (phase: LivePhase) => void
  onTurn: (turn: LiveTurn) => void
  onBlocked: (blocked: boolean) => void
  onError: (error: Error) => void
}

/** Turns are keyed by input item, so late ASR cannot overwrite the next speaker. */
export class LiveTurns {
  private turns = new Map<string, LiveTurn>()
  private responses = new Map<string, string>()
  current = ''
  input(id: string): LiveTurn {
    this.current = id
    if (!this.turns.has(id)) this.turns.set(id, { id, source: '', translation: '', done: false })
    if (this.turns.size > 20) {
      const oldest = this.turns.keys().next().value!
      this.turns.delete(oldest)
      for (const [response, item] of this.responses) if (item === oldest) this.responses.delete(response)
    }
    return this.turns.get(id)!
  }
  response(id: string): void { if (this.current) this.responses.set(id, this.current) }
  source(id: string, text: string): LiveTurn | null {
    const turn = this.turns.get(id)
    if (!turn) return null
    turn.source = text
    return { ...turn }
  }
  output(response: string, text: string, done: boolean): LiveTurn | null {
    const turn = this.turns.get(this.responses.get(response) ?? '')
    if (!turn) return null
    turn.translation = done ? text : turn.translation + text
    turn.done = done
    return { ...turn }
  }
  latency(ms: number): LiveTurn | null {
    const turn = this.turns.get(this.current)
    if (!turn) return null
    turn.latencyMs = ms
    return { ...turn }
  }
}

export class DialogueRealtime {
  private generation = 0
  private stream: MediaStream | null = null
  private peer: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private audio: HTMLAudioElement | null = null
  private abort: AbortController | null = null
  private watchdog: ReturnType<typeof setTimeout> | null = null
  private resumeTimer: ReturnType<typeof setTimeout> | null = null
  private playbackBlocked = false
  private endedAt = 0
  private responseHasAudio = false
  private responseFinished = true
  private hasInput = false

  async start(options: Options): Promise<void> {
    this.stop()
    const id = this.generation
    const alive = () => id === this.generation
    const fail = (error: unknown) => {
      if (!alive()) return
      this.stop()
      options.onError(error instanceof Error ? error : new Error('connection_failed'))
    }
    const mute = (muted: boolean) => this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted })
    const clearWatchdog = () => { if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = null }
    const listen = () => {
      clearWatchdog()
      if (this.resumeTimer) clearTimeout(this.resumeTimer)
      this.resumeTimer = setTimeout(() => {
        if (!alive() || this.playbackBlocked) return
        if (this.channel?.readyState === 'open') this.channel.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
        mute(false)
        options.onPhase('listening')
      }, 150)
    }
    const turns = new LiveTurns()
    options.onPhase('connecting')
    options.onBlocked(false)
    this.playbackBlocked = false
    this.endedAt = 0
    this.responseFinished = true
    this.hasInput = false
    try {
      const audio = new Audio()
      audio.autoplay = true
      audio.setAttribute('playsinline', 'true')
      this.audio = audio
      const primer = URL.createObjectURL(encodeWav(new Float32Array(800), 16000))
      audio.src = primer
      void audio.play().then(() => { if (alive() && audio.src === primer) audio.pause() }, () => undefined)
        .finally(() => URL.revokeObjectURL(primer))

      let abandoned = false
      const requested = navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      } })
      void requested.then(stream => { if (abandoned) stream.getTracks().forEach(track => track.stop()) }, () => undefined)
      let stream: MediaStream
      try { stream = await audioDeadline(requested, 15_000, 'microphone_timeout') }
      catch (error) { abandoned = true; throw error }
      if (!alive()) { stream.getTracks().forEach(track => track.stop()); return }
      this.stream = stream
      mute(true)
      stream.getAudioTracks().forEach(track => { track.onended = () => fail(new Error('microphone_lost')) })
      const peer = new RTCPeerConnection()
      this.peer = peer
      const channel = peer.createDataChannel('oai-events')
      this.channel = channel
      stream.getTracks().forEach(track => peer.addTrack(track, stream))
      peer.onconnectionstatechange = () => {
        if (!alive()) return
        if (peer.connectionState === 'failed' || peer.connectionState === 'closed') fail(new Error('connection_lost'))
      }
      peer.ontrack = event => {
        if (!alive()) return
        audio.removeAttribute('src')
        audio.srcObject = event.streams[0] ?? new MediaStream([event.track])
        void audio.play().then(() => {
          if (!alive()) return
          this.playbackBlocked = false
          options.onBlocked(false)
        }, () => {
          if (!alive()) return
          this.playbackBlocked = true
          mute(true)
          options.onBlocked(true)
        })
      }
      channel.onopen = () => { if (alive()) { clearWatchdog(); if (!this.playbackBlocked) { mute(false); options.onPhase('listening') } } }
      channel.onclose = () => fail(new Error('connection_lost'))
      channel.onmessage = ({ data }) => {
        if (!alive()) return
        let event
        try { event = JSON.parse(String(data)) } catch { return }
        if (event.type === 'error') { fail(new Error(String(event.error?.code || 'realtime_error'))); return }
        if (event.type === 'input_audio_buffer.speech_started') {
          this.hasInput = true
          if (this.resumeTimer) clearTimeout(this.resumeTimer)
          if (event.item_id) options.onTurn({ ...turns.input(event.item_id) })
          options.onPhase('speaking')
        }
        if (event.type === 'input_audio_buffer.speech_stopped') {
          this.endedAt = performance.now()
          options.onPhase('translating')
        }
        if (event.type === 'input_audio_buffer.committed' && event.item_id) turns.input(event.item_id)
        if (event.type === 'conversation.item.input_audio_transcription.completed') {
          const turn = turns.source(event.item_id, event.transcript || '')
          if (turn) options.onTurn(turn)
        }
        if (event.type === 'response.created') {
          turns.response(event.response.id)
          this.responseHasAudio = false
          this.responseFinished = false
          mute(true)
          options.onPhase('translating')
          clearWatchdog()
          this.watchdog = setTimeout(() => fail(new Error('response_timeout')), 45_000)
        }
        if (event.type === 'response.output_audio_transcript.delta' || event.type === 'response.output_audio_transcript.done') {
          const done = event.type.endsWith('.done')
          const turn = turns.output(event.response_id, done ? event.transcript || '' : event.delta || '', done)
          if (turn) options.onTurn(turn)
        }
        if (event.type === 'response.output_audio.delta') this.responseHasAudio = true
        if (event.type === 'output_audio_buffer.started') {
          this.responseHasAudio = true
          mute(true)
          options.onPhase('playing')
          if (this.endedAt) {
            const turn = turns.latency(Math.round(performance.now() - this.endedAt))
            if (turn) options.onTurn(turn)
          }
        }
        if (event.type === 'output_audio_buffer.stopped' || event.type === 'output_audio_buffer.cleared') listen()
        if (event.type === 'response.done') {
          this.responseFinished = true
          if (event.response?.status === 'failed') { fail(new Error('response_failed')); return }
          // response.done means generation ended; only the output buffer event
          // indicates that the user has heard all audio already queued in WebRTC.
          if (!this.responseHasAudio && !event.response?.output?.some((item: { content?: { type: string }[] }) => item.content?.some(part => part.type === 'audio'))) listen()
        }
      }
      const offer = await peer.createOffer()
      if (!alive()) return
      await peer.setLocalDescription(offer)
      this.abort = new AbortController()
      const response = await fetch('/api/auto-dialogue/realtime', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first: options.first, second: options.second, sdp: peer.localDescription?.sdp }),
        signal: AbortSignal.any([this.abort.signal, AbortSignal.timeout(35_000)]),
      })
      const session = await response.json()
      if (!alive()) return
      if (!response.ok || !session.answerSdp) throw new Error(session.error || session.code || 'connection_failed')
      await peer.setRemoteDescription({ type: 'answer', sdp: session.answerSdp })
      if (!alive()) return
      if (channel.readyState !== 'open') this.watchdog = setTimeout(() => fail(new Error('connection_timeout')), 15_000)
    } catch (error) { fail(error) }
  }

  async enableSound(): Promise<boolean> {
    const id = this.generation
    try {
      if (!this.audio) return false
      await audioDeadline(this.audio.play(), 5000, 'audio_blocked')
      if (id !== this.generation) return false
      const wasBlocked = this.playbackBlocked
      this.playbackBlocked = false
      this.stream?.getAudioTracks().forEach(track => { track.enabled = true })
      if (wasBlocked && this.hasInput && this.responseFinished && this.channel?.readyState === 'open') {
        this.channel.send(JSON.stringify({ type: 'response.create' }))
      }
      return true
    } catch { return false }
  }

  stop(): void {
    this.generation++
    if (this.watchdog) clearTimeout(this.watchdog)
    if (this.resumeTimer) clearTimeout(this.resumeTimer)
    this.watchdog = this.resumeTimer = null
    this.abort?.abort()
    this.abort = null
    if (this.channel) { this.channel.onclose = null; this.channel.onmessage = null; this.channel.onopen = null; this.channel.close() }
    this.channel = null
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
    this.stream = null
    if (this.peer) { this.peer.onconnectionstatechange = null; this.peer.ontrack = null; this.peer.close() }
    this.peer = null
    if (this.audio) { this.audio.pause(); this.audio.srcObject = null; this.audio.removeAttribute('src'); this.audio.load() }
    this.audio = null
  }
}
