import { NextRequest, NextResponse } from 'next/server'
import { readSessionEmail, unauthorized } from '@/lib/session'
import { speechFromToken } from '@/lib/dialogue-speech-token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const email = readSessionEmail(request)
  if (!email) return unauthorized()
  const text = speechFromToken(request.nextUrl.searchParams.get('token') || '', email, process.env.AUTH_SECRET || '')
  if (!text) return NextResponse.json({ code: 'invalid_speech' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ code: 'missing_api_key' }, { status: 503 })
  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]),
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.AUTO_DIALOGUE_TTS_MODEL || 'gpt-4o-mini-tts',
        voice: 'alloy', input: text, response_format: 'mp3',
      }),
    })
    if (!upstream.ok || !upstream.body) return NextResponse.json({ code: 'speech_failed' }, { status: 502 })
    // Pass through immediately: the browser starts playback from the first MP3
    // frames instead of waiting for the complete audio to be buffered/base64 encoded.
    return new Response(upstream.body, { headers: {
      'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, no-store',
      'X-Accel-Buffering': 'no', 'Referrer-Policy': 'no-referrer',
    } })
  } catch {
    return NextResponse.json({ code: 'speech_failed' }, { status: 502 })
  }
}
