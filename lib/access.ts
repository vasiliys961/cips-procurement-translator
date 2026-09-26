import bcrypt from 'bcryptjs'

export type AccessAccount = {
  email: string
  passwordHash: string
}

const DUMMY_HASH = '$2a$04$8G7aqCdNyu.ejkjmFAsrN.InjSueY5u/IjIt27aebLUs6L0nNLvMu'

export function accessAccounts(): AccessAccount[] {
  const raw = process.env.TRANSLATOR_ACCESS_USERS
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const email = String((item as { email?: unknown }).email || '').trim().toLowerCase()
      const passwordHash = String((item as { passwordHash?: unknown }).passwordHash || '')
      if (!email || !passwordHash.startsWith('$2')) return []
      return [{ email, passwordHash }]
    })
  } catch {
    return []
  }
}

export async function credentialsMatch(email: string, password: string, accounts: AccessAccount[]): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const account = accounts.find((item) => item.email === normalized)
  const hash = account?.passwordHash || DUMMY_HASH
  try {
    const valid = await bcrypt.compare(password, hash)
    return Boolean(account) && valid
  } catch {
    return false
  }
}
