import { NextRequest, NextResponse } from 'next/server'
import { accessAccounts, credentialsMatch } from '@/lib/access'
import { createSessionToken, setSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let email = ''
  let password = ''
  try {
    const body = await request.json()
    email = String(body?.email || '')
    password = String(body?.password || '')
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!email.trim() || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const accounts = accessAccounts()
  if (accounts.length === 0 || !process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 500 })
  }

  const valid = await credentialsMatch(email, password, accounts)
  if (!valid) {
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 })
  }

  const token = createSessionToken(email)
  if (!token) {
    return NextResponse.json({ error: 'Sign-in is not configured' }, { status: 500 })
  }

  const response = NextResponse.json({ email: email.trim().toLowerCase() })
  setSessionCookie(response, token)
  return response
}
