import { expect, it } from 'vitest'
import { speechFromToken, speechToken } from './dialogue-speech-token'

it('binds speech to the signed-in user and expires it', () => {
  const token = speechToken('Доставка включена.', 'buyer@example.com', 'secret', 1000)
  expect(speechFromToken(token, 'buyer@example.com', 'secret', 1001)).toBe('Доставка включена.')
  expect(speechFromToken(token, 'other@example.com', 'secret', 1001)).toBeNull()
  expect(speechFromToken(token, 'buyer@example.com', 'secret', 121000)).toBeNull()
})

it('rejects tampering and hides transcript text in the URL', () => {
  const token = speechToken('Delivery is included.', 'buyer@example.com', 'secret')
  expect(Buffer.from(token, 'base64url').toString('utf8')).not.toContain('Delivery')
  expect(speechFromToken('AAAA' + token.slice(4), 'buyer@example.com', 'secret')).toBeNull()
  expect(speechFromToken(token, 'buyer@example.com', 'wrong-secret')).toBeNull()
})
