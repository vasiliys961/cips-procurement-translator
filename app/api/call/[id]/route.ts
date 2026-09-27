import { NextRequest, NextResponse } from 'next/server'
import {
  callView,
  endCallRoom,
  getCallRoom,
  markGuestReady,
  readCallToken,
  saveAnswer,
  saveOffer,
  validSdp,
} from '@/lib/call-room'

export const runtime = 'nodejs'

function secret(): string {
  return process.env.AUTH_SECRET || ''
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.nextUrl.searchParams.get('t') || ''
  const payload = readCallToken(token, secret())
  const room = payload && payload.roomId === params.id ? getCallRoom(params.id) : null
  if (!payload || !room) {
    return NextResponse.json({ error: 'Call not found', code: 'not_found' }, { status: 404 })
  }
  return NextResponse.json(callView(room, payload.role))
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let token = ''
  let action = ''
  let sdp = ''
  try {
    const body = await request.json()
    token = String(body?.token || '')
    action = String(body?.action || '')
    sdp = typeof body?.sdp === 'string' ? body.sdp : ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'invalid_json' }, { status: 400 })
  }

  const payload = readCallToken(token, secret())
  const room = payload && payload.roomId === params.id ? getCallRoom(params.id) : null
  if (!payload || !room || room.ended) {
    return NextResponse.json({ error: 'Call not found', code: 'not_found' }, { status: 404 })
  }

  if (action === 'ready' && payload.role === 'guest') {
    markGuestReady(room)
  } else if (action === 'offer' && payload.role === 'host' && validSdp(sdp)) {
    saveOffer(room, sdp)
  } else if (action === 'answer' && payload.role === 'guest' && validSdp(sdp)) {
    saveAnswer(room, sdp)
  } else if (action === 'end') {
    endCallRoom(room)
  } else {
    return NextResponse.json({ error: 'Call not found', code: 'not_found' }, { status: 400 })
  }

  return NextResponse.json(callView(room, payload.role))
}
