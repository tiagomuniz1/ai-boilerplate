import { useSidebarStore } from './sidebar.store'

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isMobileOpen: false })
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
