import { describe, expect, it } from 'vitest'
import {
  authorizeCall,
  createCallRoom,
  endCallRoom,
  getCallRoom,
  markGuestReady,
  readCallToken,
  resetCallRoomsForTests,
} from './call-room'

const secret = 'test-secret'

describe('call rooms', () => {
  it('lets the guest translate only their direction', () => {
    resetCallRoomsForTests()
    const created = createCallRoom('ru', 'en', secret)
    expect(created).not.toBeNull()
    if (!created) return
    expect(authorizeCall(created.guestToken, 'en', 'ru', secret)).toBe(true)
    expect(authorizeCall(created.guestToken, 'ru', 'en', secret)).toBe(false)
    expect(authorizeCall(created.hostToken, 'ru', 'en', secret)).toBe(true)
    expect(readCallToken(created.guestToken, 'other-secret')).toBeNull()
    endCallRoom(created.room)
    expect(authorizeCall(created.guestToken, 'en', 'ru', secret)).toBe(false)
  })

  it('marks the guest ready on the same room', () => {
    resetCallRoomsForTests()
    const created = createCallRoom('ru', 'en', secret)
    if (!created) throw new Error('room')
    markGuestReady(created.room)
    expect(getCallRoom(created.room.id)?.guestReady).toBe(true)
  })
})
