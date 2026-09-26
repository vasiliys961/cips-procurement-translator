import { NextRequest, NextResponse } from 'next/server'
import { realtimeTranslationCredits } from '@/lib/cost-calculator'
import { readSessionEmail, unauthorized } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SECONDS_PER_CHARGE = 180

export async function POST(request: NextRequest) {
  if (!readSessionEmail(request)) return unauthorized()

  let seconds = 0
  try {
    const body = await request.json()
    seconds = Number(body?.seconds)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_SECONDS_PER_CHARGE) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  }

  return NextResponse.json({
    allowed: true,
    charged: seconds === 0 ? 0 : realtimeTranslationCredits(seconds),
  })
}
