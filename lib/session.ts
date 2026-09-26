import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const SESSION_COOKIE = 'translator_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7

type SessionPayload = {
  email: string
  exp: number
}

function secret(): string {
  return process.env.AUTH_SECRET || ''
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url')
}

export function createSessionToken(email: string): string | null {
  if (!secret()) return null
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function readSessionEmail(request: NextRequest): string | null {
  if (!secret()) return null
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = sign(body)
  const left = Buffer.from(signature)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload.email || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload.email
  } catch {
    return null
  }
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Sign in required', code: 'unauthorized' }, { status: 401 })
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
