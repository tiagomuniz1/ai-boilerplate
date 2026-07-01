import { renderHook } from '@testing-library/react'
import { UserRole } from '@app/shared'
import { useSidebarNavigation } from './use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'

const mockUsePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

jest.mock('@/lib/slug-context', () => ({
  useSlug: () => 'test-clinic',
}))

function setRole(role: UserRole) {
  useAuthStore.setState({ user: { id: 'u1', fullName: 'Test', email: 't@t.com', role } })
}

describe('useSidebarNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/test-clinic/dashboard')
    setRole(UserRole.ADMIN)
  })

  it('returns navigation items for current role', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.items.length).toBeGreaterThan(0)
  })

  it('marks dashboard item as active on exact match', () => {
    mockUsePathname.mockReturnValue('/test-clinic/dashboard')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'dashboard')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active on exact match', () => {
    mockUsePathname.mockReturnValue('/test-clinic/users')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active for sub-path', () => {
    mockUsePathname.mockReturnValue('/test-clinic/users/123')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks users item as active for nested sub-path', () => {
    mockUsePathname.mockReturnValue('/test-clinic/users/123/edit')
    const { result } = renderHook(() => useSidebarNavigation())
    const item = result.current.items.find((i) => i.id === 'users')
    expect(item?.isActive).toBe(true)
  })

  it('marks only the matching item as active', () => {
    mockUsePathname.mockReturnValue('/test-clinic/dashboard')
    const { result } = renderHook(() => useSidebarNavigation())
    const inactiveItems = result.current.items.filter((i) => i.id !== 'dashboard')
    expect(inactiveItems.every((i) => !i.isActive)).toBe(true)
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

  it('hrefs include the clinic slug prefix', () => {
    const { result } = renderHook(() => useSidebarNavigation())
    result.current.items.forEach((item) => {
      expect(item.href).toMatch(/^\/test-clinic\//)
    })
  })

  it('ADMIN sees 8 items: dashboard, users, patients, doctors, medical-record-templates, prescription-templates, appointments, schedules', () => {
    setRole(UserRole.ADMIN)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'users', 'patients', 'doctors', 'medical-record-templates', 'prescription-templates', 'appointments', 'schedules']))
    expect(ids).toHaveLength(8)
    expect(ids).not.toContain('specialties')
  })

  it('DOCTOR sees dashboard, doctors, prescription-templates, appointments and schedules', () => {
    setRole(UserRole.DOCTOR)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'doctors', 'prescription-templates', 'appointments', 'schedules']))
    expect(ids).not.toContain('users')
    expect(ids).not.toContain('patients')
    expect(ids).not.toContain('medical-record-templates')
    expect(ids).not.toContain('specialties')
  })

  it('USER sees dashboard, patients, doctors and appointments', () => {
    setRole(UserRole.USER)
    const { result } = renderHook(() => useSidebarNavigation())
    const ids = result.current.items.map((i) => i.id)
    expect(ids).toEqual(expect.arrayContaining(['dashboard', 'patients', 'doctors', 'appointments']))
    expect(ids).not.toContain('users')
    expect(ids).not.toContain('schedules')
    expect(ids).not.toContain('specialties')
  })

  it('returns empty items when no user is logged in', () => {
    useAuthStore.setState({ user: null })
    const { result } = renderHook(() => useSidebarNavigation())
    expect(result.current.items).toHaveLength(0)
  })
})
