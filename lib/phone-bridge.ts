export type CallSnapshot = {
  role: 'host' | 'guest'
  hostLanguage: string
  guestLanguage: string
  guestReady: boolean
  offer: string
  answer: string
  ended: boolean
}

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export async function readCall(id: string, token: string): Promise<CallSnapshot> {
  const response = await fetch(`/api/call/${id}?t=${encodeURIComponent(token)}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('call')
  return response.json() as Promise<CallSnapshot>
}

export async function postCall(id: string, token: string, action: string, sdp = ''): Promise<CallSnapshot> {
  const response = await fetch(`/api/call/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, action, sdp }),
  })
  if (!response.ok) throw new Error('call')
  return response.json() as Promise<CallSnapshot>
}

export function createPhonePeer(audio: HTMLAudioElement): RTCPeerConnection {
  const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS })
  peer.ontrack = (event) => {
    const [stream] = event.streams
    if (!stream) return
    audio.srcObject = stream
    void audio.play().catch(() => undefined)
  }
  return peer
}

export function waitForIceGathering(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timeout)
      peer.removeEventListener('icegatheringstatechange', onChange)
      resolve()
    }
    const onChange = () => {
      if (peer.iceGatheringState === 'complete') finish()
    }
    const timeout = setTimeout(finish, 2500)
    peer.addEventListener('icegatheringstatechange', onChange)
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
