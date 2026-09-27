import { NextRequest, NextResponse } from 'next/server'
import { createCallRoom } from '@/lib/call-room'
import { findTranslatorLanguage } from '@/lib/realtime-translate'
import { readSessionEmail, unauthorized } from '@/lib/session'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!readSessionEmail(request)) return unauthorized()
  const secret = process.env.AUTH_SECRET || ''
  if (!secret) {
    return NextResponse.json({ error: 'Sign-in is not configured', code: 'unauthorized' }, { status: 500 })
  }

  let hostLanguage = ''
  let guestLanguage = ''
  try {
    const body = await request.json()
    hostLanguage = String(body?.hostLanguage || '')
    guestLanguage = String(body?.guestLanguage || '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'invalid_json' }, { status: 400 })
  }

  const host = findTranslatorLanguage(hostLanguage)
  const guest = findTranslatorLanguage(guestLanguage)
  if (!host || !guest) {
    return NextResponse.json({ error: 'Unknown language', code: 'unknown_language' }, { status: 400 })
  }
  if (!host.outputCode || !guest.outputCode || host.code === guest.code) {
    return NextResponse.json({ error: 'Choose two spoken languages.', code: 'same_language' }, { status: 400 })
  }

  const created = createCallRoom(host.code, guest.code, secret)
  if (!created) {
    return NextResponse.json({ error: 'Sign-in is not configured', code: 'unauthorized' }, { status: 500 })
  }

  return NextResponse.json({
    id: created.room.id,
    hostToken: created.hostToken,
    guestToken: created.guestToken,
  })
}
