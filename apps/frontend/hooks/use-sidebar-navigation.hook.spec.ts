import { renderHook, act } from '@testing-library/react'
import { UserRole } from '@app/shared'
import { useSidebarNavigation } from './use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import { useSidebarStore } from '@/stores/sidebar.store'

const mockUsePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

function setRole(role: UserRole) {
  useAuthStore.setState({ user: { id: 'u1', fullName: 'Test', email: 't@t.com', role } })
}

describe('useSidebarNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
    useSidebarStore.setState({ isCollapsed: false })
    setRole(UserRole.ADMIN)
  })

  it('returns navigation items for current role', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.items.length).toBeGreaterThan(0)
  })

  it('marks dashboard item as active on exact match', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'dashboard')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active on exact match', () => {
    mockUsePathname.mockReturnValue('/users')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active for sub-path', () => {
    mockUsePathname.mockReturnValue('/users/123')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active for nested sub-path', () => {
    mockUsePathname.mockReturnValue('/users/123/edit')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks only the matching item as active', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    const { result } = renderHook(() => useSidebarNavigation())
    const inactiveItems = result.current.items.filter((i) => i.id !== 'dashboard')
    expect(inactiveItems.every((i) => !i.isActive)).toBe(true)
  })

  it('returns isCollapsed from store', () => {
    useSidebarStore.setState({ isCollapsed: true })
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.isCollapsed).toBe(true)
  })

  it('returns isCollapsed false by default', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.isCollapsed).toBe(false)
  })

  it('toggle changes isCollapsed state', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    act(() => result.current.toggle())
    expect(result.current.isCollapsed).toBe(true)
  })

  it('each item has id, label, href, and isActive fields', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    result.current.items.forEach((item) => {
      expect(item.id).toBeDefined()
      expect(item.label).toBeDefined()
      expect(item.href).toBeDefined()
      expect(typeof item.isActive).toBe('boolean')
    })
  })

  it('ADMIN sees all 5 items', () => {
    setRole(UserRole.ADMIN)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'users', 'patients', 'doctors', 'schedules']))
    expect(ids).toHaveLength(5)
  })

  it('DOCTOR sees dashboard, doctors and schedules', () => {
    setRole(UserRole.DOCTOR)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'doctors', 'schedules']))
    expect(ids).not.toContain('users')
    expect(ids).not.toContain('patients')
  })

  it('USER sees dashboard, patients and doctors', () => {
    setRole(UserRole.USER)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'patients', 'doctors']))
    expect(ids).not.toContain('users')
    expect(ids).not.toContain('schedules')
  })

  it('returns empty items when no user is logged in', () => {
    useAuthStore.setState({ user: null })
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.items).toHaveLength(0)
  })
})
