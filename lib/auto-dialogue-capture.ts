import { encodeWav, SpeechBoundary } from './auto-dialogue'

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

  async start(onAudio: (audio: Blob) => void, onSpeaking: () => void, onLost: () => void): Promise<void> {
    this.stop()
    const generation = this.generation
    const alive = () => generation === this.generation
    const context = new AudioContext()
    this.context = context
    // Resume during the Start gesture, before asking for microphone access.
    await context.resume()
    if (!alive()) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    } })
    if (!alive()) { stream.getTracks().forEach(track => track.stop()); return }
    this.stream = stream
    stream.getAudioTracks().forEach(track => { track.onended = () => { if (alive()) onLost() } })
    await context.audioWorklet.addModule('/auto-dialogue-capture.js')
    if (!alive()) return
    const source = context.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(context, 'dialogue-capture')
    this.node = node
    node.onprocessorerror = () => { if (alive()) onLost() }
    source.connect(node)
    node.connect(context.destination)
    node.port.onmessage = ({ data }: MessageEvent<Float32Array>) => {
      if (!alive() || !this.enabled) return
      const frame = data
      this.clock += frame.length / context.sampleRate * 1000
      let energy = 0
      for (const value of frame) energy += value * value
      const state = this.boundary.update(Math.sqrt(energy / frame.length), this.clock)
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
    this.pause()
    this.node?.disconnect()
    if (this.node) this.node.port.onmessage = null
    this.node = null
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop() })
    this.stream = null
    void this.context?.close().catch(() => undefined)
    this.context = null
  }
}
