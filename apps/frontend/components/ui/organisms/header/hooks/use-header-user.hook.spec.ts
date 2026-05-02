import { renderHook } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth.store'
import { useHeaderUser } from './use-header-user.hook'

describe('useHeaderUser', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
  })

  it('returns null user and isAuthenticated false when store has no user', () => {
    const { result } = renderHook(() => useHeaderUser())

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('returns mapped IHeaderUserModel and isAuthenticated true when user is logged in', () => {
    const storeUser = {
      id: 'user-123',
      fullName: 'Maria Silva',
      email: 'maria@example.com',
    }

    useAuthStore.setState({ user: storeUser })

    const { result } = renderHook(() => useHeaderUser())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toEqual({
      id: 'user-123',
      fullName: 'Maria Silva',
      email: 'maria@example.com',
    })
  })

  it('maps all user fields correctly from auth store', () => {
    const storeUser = {
      id: 'abc-456',
      fullName: 'João Oliveira',
      email: 'joao@clinic.com',
    }

    useAuthStore.setState({ user: storeUser })

    const { result } = renderHook(() => useHeaderUser())

    expect(result.current.user?.id).toBe('abc-456')
    expect(result.current.user?.fullName).toBe('João Oliveira')
    expect(result.current.user?.email).toBe('joao@clinic.com')
  })

  it('updates when store user changes from null to logged in', () => {
    const { result, rerender } = renderHook(() => useHeaderUser())

    expect(result.current.isAuthenticated).toBe(false)

    useAuthStore.setState({
      user: { id: 'user-789', fullName: 'Ana Souza', email: 'ana@example.com' },
    })

    rerender()

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user?.fullName).toBe('Ana Souza')
  })

  it('updates when store user changes from logged in to null', () => {
    useAuthStore.setState({
      user: { id: 'user-789', fullName: 'Ana Souza', email: 'ana@example.com' },
    })

    const { result, rerender } = renderHook(() => useHeaderUser())

    expect(result.current.isAuthenticated).toBe(true)

    useAuthStore.setState({ user: null })

    rerender()

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })
})
