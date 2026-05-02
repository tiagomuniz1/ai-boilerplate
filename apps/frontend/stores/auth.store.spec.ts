import { useAuthStore } from './auth.store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('has user as null in initial state', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser updates user state', () => {
    const user = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }
    useAuthStore.getState().setUser(user)
    expect(useAuthStore.getState().user).toEqual(user)
  })

  it('setUser with null clears user state', () => {
    useAuthStore.setState({ user: { id: 'uuid-1', fullName: 'Alice', email: 'alice@example.com' } })
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })
})
