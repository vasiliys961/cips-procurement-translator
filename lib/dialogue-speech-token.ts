import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

// Stateless, encrypted, short-lived URL. No utterance text or API key in URLs/logs.
export function speechToken(text: string, email: string, secret: string, now = Date.now()): string {
  if (!secret) throw new Error('missing_secret')
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify({ text, email, exp: now + 120_000 }), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function speechFromToken(token: string, email: string, secret: string, now = Date.now()): string | null {
  if (!secret || token.length > 24576) return null
  try {
    const bytes = Buffer.from(token, 'base64url')
    if (bytes.length < 29) return null
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), bytes.subarray(0, 12))
    decipher.setAuthTag(bytes.subarray(12, 28))
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'))
    return data.email === email && typeof data.exp === 'number' && data.exp > now
      && typeof data.text === 'string' && data.text.length > 0 && data.text.length <= 4096 ? data.text : null
  } catch { return null }
}
