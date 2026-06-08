import { UserRole } from '@app/shared'
import { useAuthStore } from './auth.store'

const mockUser = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.ADMIN,
  clinicId: 'clinic-uuid-1',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('has user as null in initial state', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clinicId is null when user is not authenticated', () => {
    expect(useAuthStore.getState().user?.clinicId).toBeUndefined()
  })

  it('setUser updates user state', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user).toEqual(mockUser)
  })

  it('exposes clinicId after setUser', () => {
    useAuthStore.getState().setUser(mockUser)
    expect(useAuthStore.getState().user?.clinicId).toBe('clinic-uuid-1')
  })

  it('setUser with null clears user state', () => {
    useAuthStore.setState({ user: mockUser })
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clinicId returns undefined after setUser(null)', () => {
    useAuthStore.setState({ user: mockUser })
    useAuthStore.getState().setUser(null)
    expect(useAuthStore.getState().user?.clinicId).toBeUndefined()
  })
})
