import { NextRequest, NextResponse } from 'next/server'
import { readSessionEmail, unauthorized } from '@/lib/session'
import { dialogueRealtimeSession } from '@/lib/dialogue-realtime-session'
import { openaiSdpCall } from '@/lib/openai-sdp-call'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  if (!readSessionEmail(request)) return unauthorized()
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ code: 'missing_api_key' }, { status: 503 })
  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ code: 'invalid_json' }, { status: 400 })
  }
  if (typeof body.sdp !== 'string' || !body.sdp.startsWith('v=') || body.sdp.length > 100_000) {
    return NextResponse.json({ code: 'invalid_sdp' }, { status: 400 })
  }
  let session
  try { session = dialogueRealtimeSession(String(body.first), String(body.second)) } catch {
    return NextResponse.json({ code: 'invalid_pair' }, { status: 400 })
  }
  const form = new FormData()
  form.set('sdp', body.sdp)
  form.set('session', JSON.stringify(session))
  try {
    const upstream = await openaiSdpCall(form, AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]))
    if (upstream.status < 200 || upstream.status >= 300) {
      let data
      try { data = JSON.parse(upstream.body) } catch { data = {} }
      const message = String(data?.error?.message || 'Realtime connection failed')
        .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]').slice(0, 250)
      return NextResponse.json({ code: 'realtime_failed', error: message }, { status: 502 })
    }
    const answerSdp = upstream.body
    if (!answerSdp.startsWith('v=')) throw new Error('invalid_answer')
    return NextResponse.json({ answerSdp }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ code: 'realtime_failed' }, { status: 502 })
  }
}
