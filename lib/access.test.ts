import bcrypt from 'bcryptjs'
import { describe, expect, it } from 'vitest'
import { credentialsMatch, type AccessAccount } from './access'

const accounts: AccessAccount[] = [
  { email: 'doctor@example.com', passwordHash: bcrypt.hashSync('correct horse', 4) },
]

describe('translator access', () => {
  it('accepts the matching Opus account', async () => {
    await expect(credentialsMatch('Doctor@Example.com', 'correct horse', accounts)).resolves.toBe(true)
  })

  it('rejects a wrong password and an unknown email', async () => {
    await expect(credentialsMatch('doctor@example.com', 'nope', accounts)).resolves.toBe(false)
    await expect(credentialsMatch('other@example.com', 'correct horse', accounts)).resolves.toBe(false)
  })
})
