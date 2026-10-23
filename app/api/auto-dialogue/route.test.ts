import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { readSessionEmail } from '@/lib/session'

vi.mock('@/lib/session', async () => {
  const { NextResponse } = await import('next/server')
  return { readSessionEmail: vi.fn(() => 'test@example.com'), unauthorized: () => NextResponse.json({}, { status: 401 }) }
})

function request(first = 'ru', second = 'en') {
  const form = new FormData()
  form.append('first', first); form.append('second', second)
  form.append('audio', new Blob([new Uint8Array(1000)], { type: 'audio/wav' }), 'utterance.wav')
  return new NextRequest('https://example.com/api/auto-dialogue', { method: 'POST', body: form })
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  vi.mocked(readSessionEmail).mockReturnValue('test@example.com')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('auto dialogue API', () => {
  it('requires a signed-in user before any provider request', async () => {
    vi.mocked(readSessionEmail).mockReturnValue(null)
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream)
    expect((await POST(request())).status).toBe(401)
    expect(upstream).not.toHaveBeenCalled()
  })
  it('rejects invalid pairs without paying for recognition', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream)
    expect((await POST(request('ru', 'ru'))).status).toBe(400)
    expect(upstream).not.toHaveBeenCalled()
  })
  it('does not translate a third language or ambiguous response', async () => {
    for (const heard of [{ text: 'Bonjour tout le monde', language: 'french' }, { text: 'OK', language: 'english' }]) {
      const upstream = vi.fn().mockResolvedValue(Response.json(heard)); vi.stubGlobal('fetch', upstream)
      const response = await POST(request())
      expect((await response.json()).retry).toBe(true)
      expect(upstream).toHaveBeenCalledTimes(1)
    }
  })
  it('routes an English answer to Russian, preserves text, and returns synthesized audio', async () => {
    const upstream = vi.fn()
      .mockResolvedValueOnce(Response.json({ text: 'Delivery is included.', language: 'english' }))
      .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'stop', message: { content: 'Доставка включена.' } }] }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3])))
    vi.stubGlobal('fetch', upstream)
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ language: 'en', target: 'ru', source: 'Delivery is included.', translation: 'Доставка включена.', audio: 'AQID' })
    const translation = JSON.parse(upstream.mock.calls[1][1].body)
    expect(translation.messages[0].content).toContain('into Русский')
    expect(translation.messages[1].content).toBe('Delivery is included.')
    expect(JSON.parse(upstream.mock.calls[2][1].body).input).toBe('Доставка включена.')
  })
  it('does not speak a truncated translation and releases the request lock after failure', async () => {
    const upstream = vi.fn()
      .mockResolvedValueOnce(Response.json({ text: 'Delivery is included.', language: 'english' }))
      .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: 'length', message: { content: 'Доставка' } }] }))
    vi.stubGlobal('fetch', upstream)
    expect((await POST(request())).status).toBe(502)
    expect(upstream).toHaveBeenCalledTimes(2)
    upstream.mockResolvedValueOnce(Response.json({ text: 'OK', language: 'english' }))
    expect((await POST(request())).status).toBe(200)
  })
})
