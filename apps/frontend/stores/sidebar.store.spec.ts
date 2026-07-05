import { useSidebarStore } from './sidebar.store'

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isCollapsed: false, isMobileOpen: false })
  })

  it('has isCollapsed as false in initial state', () => {
    expect(useSidebarStore.getState().isCollapsed).toBe(false)
  })

  it('toggle switches isCollapsed from false to true', () => {
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().isCollapsed).toBe(true)
  })

  it('toggle switches isCollapsed from true to false', () => {
    useSidebarStore.setState({ isCollapsed: true })
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().isCollapsed).toBe(false)
  })

  it('setCollapsed sets isCollapsed to true', () => {
    useSidebarStore.getState().setCollapsed(true)
    expect(useSidebarStore.getState().isCollapsed).toBe(true)
  })

  it('setCollapsed sets isCollapsed to false', () => {
    useSidebarStore.setState({ isCollapsed: true })
    useSidebarStore.getState().setCollapsed(false)
    expect(useSidebarStore.getState().isCollapsed).toBe(false)
  })

  it('has isMobileOpen as false in initial state', () => {
    expect(useSidebarStore.getState().isMobileOpen).toBe(false)
  })

  it('openMobile sets isMobileOpen to true', () => {
    useSidebarStore.getState().openMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(true)
  })

  it('closeMobile sets isMobileOpen to false', () => {
    useSidebarStore.setState({ isMobileOpen: true })
    useSidebarStore.getState().closeMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(false)
  })

  it('toggleMobile switches isMobileOpen from false to true', () => {
    useSidebarStore.getState().toggleMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(true)
  })

  it('toggleMobile switches isMobileOpen from true to false', () => {
    useSidebarStore.setState({ isMobileOpen: true })
    useSidebarStore.getState().toggleMobile()
    expect(useSidebarStore.getState().isMobileOpen).toBe(false)
  })
})
