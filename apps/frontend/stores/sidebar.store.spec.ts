import { useSidebarStore } from './sidebar.store'

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ isCollapsed: false })
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
})
