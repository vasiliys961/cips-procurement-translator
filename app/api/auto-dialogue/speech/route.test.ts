import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'
import { speechToken } from '@/lib/dialogue-speech-token'
import { readSessionEmail } from '@/lib/session'

vi.mock('@/lib/session', () => ({
  readSessionEmail: vi.fn(() => 'buyer@example.com'),
  unauthorized: () => NextResponse.json({}, { status: 401 }),
}))
beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'test-key')
  vi.stubEnv('AUTH_SECRET', 'test-secret')
  vi.mocked(readSessionEmail).mockReturnValue('buyer@example.com')
})
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('streams the first audio bytes before the provider finishes generating', async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([1, 2, 3])) } })
  const upstream = vi.fn().mockResolvedValue(new Response(body))
  vi.stubGlobal('fetch', upstream)
  const token = speechToken('Delivery is included.', 'buyer@example.com', 'test-secret')
  const response = await GET(new NextRequest('https://example.com/api/auto-dialogue/speech?token=' + token))
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('audio/mpeg')
  const reader = response.body!.getReader()
  expect((await reader.read()).value).toEqual(new Uint8Array([1, 2, 3]))
  await reader.cancel()
  expect(JSON.parse(upstream.mock.calls[0][1].body).input).toBe('Delivery is included.')
})

it('rejects unauthorized and expired requests before invoking speech generation', async () => {
  const upstream = vi.fn(); vi.stubGlobal('fetch', upstream)
  vi.mocked(readSessionEmail).mockReturnValue(null)
  expect((await GET(new NextRequest('https://example.com/api/auto-dialogue/speech'))).status).toBe(401)
  vi.mocked(readSessionEmail).mockReturnValue('buyer@example.com')
  const token = speechToken('Hello', 'buyer@example.com', 'test-secret', 0)
  expect((await GET(new NextRequest('https://example.com/api/auto-dialogue/speech?token=' + token))).status).toBe(403)
  expect(upstream).not.toHaveBeenCalled()
})
