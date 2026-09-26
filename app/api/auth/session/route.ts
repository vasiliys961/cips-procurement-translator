import { NextRequest, NextResponse } from 'next/server'
import { readSessionEmail } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const email = readSessionEmail(request)
  if (!email) return NextResponse.json({ email: null })
  return NextResponse.json({ email })
}
