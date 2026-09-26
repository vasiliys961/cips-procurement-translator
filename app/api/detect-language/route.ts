import { NextRequest, NextResponse } from 'next/server'
import { languageFromWhisperName } from '@/lib/detect-language'
import { readSessionEmail, unauthorized } from '@/lib/session'

export const runtime = 'nodejs'

function publicError(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .slice(0, 300)
}

export async function POST(request: NextRequest) {
  if (!readSessionEmail(request)) return unauthorized()

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured' }, { status: 500 })
  }

  let audio: FormDataEntryValue | null = null
  try {
    const form = await request.formData()
    audio = form.get('audio')
  } catch {
    return NextResponse.json({ error: 'Invalid form' }, { status: 400 })
  }

  if (!(audio instanceof File) || audio.size < 800) {
    return NextResponse.json({ error: 'Say a little more' }, { status: 400 })
  }

  const body = new FormData()
  body.append('file', audio, audio.name || 'sample.webm')
  body.append('model', 'whisper-1')
  body.append('response_format', 'verbose_json')

  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    })
    const payload = await upstream.json().catch(() => null)
    if (!upstream.ok) {
      const message = typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'Language detection failed'
      return NextResponse.json({ error: publicError(message) }, { status: upstream.status })
    }

    const text = typeof payload?.text === 'string' ? payload.text.trim() : ''
    const rawLanguage = typeof payload?.language === 'string' ? payload.language : ''
    const match = languageFromWhisperName(rawLanguage)
    return NextResponse.json({
      text,
      language: match?.code ?? null,
      label: match?.label ?? rawLanguage,
      speakable: Boolean(match?.outputCode),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Language detection failed'
    return NextResponse.json({ error: publicError(message) }, { status: 502 })
  }
}
