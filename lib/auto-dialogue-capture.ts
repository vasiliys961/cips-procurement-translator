import { encodeWav, SpeechBoundary } from './auto-dialogue'

export async function audioDeadline<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(code)), ms)
    })])
  } finally { if (timer) clearTimeout(timer) }
}

export class DialogueMicrophone {
  private generation = 0
  private context: AudioContext | null = null
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private enabled = false
  private boundary = new SpeechBoundary()
  private frames: Float32Array[] = []
  private sampleCount = 0
  private clock = 0
  private ownsContext = false
  private frameTimer: ReturnType<typeof setTimeout> | null = null

  async start(onAudio: (audio: Blob) => void, onSpeaking: () => void, onLost: (error?: Error) => void,
    options: { context?: AudioContext; onLevel?: (level: number) => void } = {}): Promise<void> {
    this.stop()
    const generation = this.generation
    const alive = () => generation === this.generation
    const context = options.context ?? new AudioContext()
    this.context = context
    this.ownsContext = !options.context
    // Request permission immediately. Some browsers leave resume() pending until
    // capture is permitted; awaiting it here would prevent the permission prompt.
    void context.resume().catch(() => undefined)
    let waiting = true
    const requested = navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    } })
    void requested.then(stream => {
      if (!waiting) stream.getTracks().forEach(track => track.stop())
    }, () => undefined)
    let stream: MediaStream
    try { stream = await audioDeadline(requested, 15_000, 'microphone_timeout') }
    catch (error) { waiting = false; throw error }
    if (!alive()) { stream.getTracks().forEach(track => track.stop()); return }
    this.stream = stream
    stream.getAudioTracks().forEach(track => { track.onended = () => { if (alive()) onLost() } })
    await audioDeadline(context.resume(), 5000, 'audio_blocked')
    if (!alive()) return
    await audioDeadline(context.audioWorklet.addModule('/auto-dialogue-capture.js'), 8000, 'capture_unavailable')
    if (!alive()) return
    const source = context.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(context, 'dialogue-capture')
    this.node = node
    node.onprocessorerror = () => { if (alive()) onLost() }
    source.connect(node)
    node.connect(context.destination)
    this.frameTimer = setTimeout(() => { if (alive()) onLost(new Error('capture_no_frames')) }, 4000)
    let lastLevelAt = 0
    node.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
      if (this.frameTimer) { clearTimeout(this.frameTimer); this.frameTimer = null }
      if (!alive() || !this.enabled) return
      const frame = data
      this.clock += frame.length / context.sampleRate * 1000
      let energy = 0
      for (const value of frame) energy += value * value
      const rms = Math.sqrt(energy / frame.length)
      if (this.clock < lastLevelAt) lastLevelAt = 0
      if (this.clock - lastLevelAt >= 100) { options.onLevel?.(Math.min(1, rms * 12)); lastLevelAt = this.clock }
      const state = this.boundary.update(rms, this.clock)
      this.frames.push(frame)
      this.sampleCount += frame.length
      if (state === 'waiting') {
        while (this.frames.length > 1 && this.sampleCount - this.frames[0].length > context.sampleRate * 0.35) {
          this.sampleCount -= this.frames.shift()!.length
        }
      } else if (state === 'speaking') {
        onSpeaking()
      } else {
        const samples = new Float32Array(this.sampleCount)
        let offset = 0
        for (const chunk of this.frames) { samples.set(chunk, offset); offset += chunk.length }
        this.pause()
        onAudio(encodeWav(samples, context.sampleRate))
      }
    }
    this.resume()
  }

  pause(): void {
    this.enabled = false
    this.stream?.getAudioTracks().forEach(track => { track.enabled = false })
    this.frames = []
    this.sampleCount = 0
    this.clock = 0
    this.boundary = new SpeechBoundary()
  }

  resume(): void {
    this.pause()
    this.stream?.getAudioTracks().forEach(track => { track.enabled = true })
    this.enabled = true
  }

  stop(): void {
    this.generation++
    if (this.frameTimer) clearTimeout(this.frameTimer)
    this.frameTimer = null
    this.pause()
    this.node?.disconnect()
    if (this.node) this.node.port.onmessage = null
    this.node = null
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
    this.stream = null
    if (this.ownsContext) void this.context?.close().catch(() => undefined)
    this.context = null
    this.ownsContext = false
  }
}
