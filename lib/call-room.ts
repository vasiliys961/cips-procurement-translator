import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export type CallRole = 'host' | 'guest'

export type CallRoom = {
  id: string
  hostLanguage: string
  guestLanguage: string
  exp: number
  guestReady: boolean
  offer: string
  answer: string
  ended: boolean
}

export type CallView = {
  role: CallRole
  hostLanguage: string
  guestLanguage: string
  guestReady: boolean
  offer: string
  answer: string
  ended: boolean
}

type TokenPayload = {
  roomId: string
  role: CallRole
  exp: number
}

const ROOM_TTL_MS = 2 * 60 * 60 * 1000

function rooms(): Map<string, CallRoom> {
  const globalStore = globalThis as typeof globalThis & { __cipsCallRooms?: Map<string, CallRoom> }
  if (!globalStore.__cipsCallRooms) globalStore.__cipsCallRooms = new Map()
  return globalStore.__cipsCallRooms
}

export function resetCallRoomsForTests(): void {
  rooms().clear()
}

export function signCallToken(roomId: string, role: CallRole, secret: string, exp = Date.now() + ROOM_TTL_MS): string | null {
  if (!secret) return null
  const body = Buffer.from(JSON.stringify({ roomId, role, exp })).toString('base64url')
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function readCallToken(token: string, secret: string): TokenPayload | null {
  if (!secret || !token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload
    if ((payload.role !== 'host' && payload.role !== 'guest') || !payload.roomId || payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function createCallRoom(
  hostLanguage: string,
  guestLanguage: string,
  secret: string
): { room: CallRoom; hostToken: string; guestToken: string } | null {
  const id = randomBytes(9).toString('base64url')
  const exp = Date.now() + ROOM_TTL_MS
  const hostToken = signCallToken(id, 'host', secret, exp)
  const guestToken = signCallToken(id, 'guest', secret, exp)
  if (!hostToken || !guestToken) return null
  const room: CallRoom = {
    id,
    hostLanguage,
    guestLanguage,
    exp,
    guestReady: false,
    offer: '',
    answer: '',
    ended: false,
  }
  rooms().set(id, room)
  return { room, hostToken, guestToken }
}

export function getCallRoom(id: string): CallRoom | null {
  const room = rooms().get(id)
  if (!room) return null
  if (room.exp < Date.now()) {
    rooms().delete(id)
    return null
  }
  return room
}

export function callDirection(room: CallRoom, role: CallRole): { source: string; target: string } {
  if (role === 'host') return { source: room.hostLanguage, target: room.guestLanguage }
  return { source: room.guestLanguage, target: room.hostLanguage }
}

export function authorizeCall(token: string, source: string, target: string, secret: string): boolean {
  const payload = readCallToken(token, secret)
  if (!payload) return false
  const room = getCallRoom(payload.roomId)
  if (!room || room.ended) return false
  const direction = callDirection(room, payload.role)
  return direction.source === source && direction.target === target
}

export function callView(room: CallRoom, role: CallRole): CallView {
  return {
    role,
    hostLanguage: room.hostLanguage,
    guestLanguage: room.guestLanguage,
    guestReady: room.guestReady,
    offer: role === 'guest' ? room.offer : '',
    answer: role === 'host' ? room.answer : '',
    ended: room.ended,
  }
}

export function markGuestReady(room: CallRoom): void {
  room.guestReady = true
}

export function saveOffer(room: CallRoom, sdp: string): void {
  room.offer = sdp
}

export function saveAnswer(room: CallRoom, sdp: string): void {
  room.answer = sdp
}

export function endCallRoom(room: CallRoom): void {
  room.ended = true
  room.offer = ''
  room.answer = ''
}

export function validSdp(sdp: string): boolean {
  return sdp.startsWith('v=') && sdp.length < 200_000
}
