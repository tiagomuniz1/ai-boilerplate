import { renderHook, act } from '@testing-library/react'
import { useSidebarNavigation } from './use-sidebar-navigation.hook'
import { useSidebarStore } from '@/stores/sidebar.store'

const mockUsePathname = jest.fn()

jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('useSidebarNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
    useSidebarStore.setState({ isCollapsed: false })
  })

  it('returns all navigation items', () => {
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
})
