import { useThemeStore, getSystemTheme } from './theme.store'

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: prefersDark && query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }),
  })
}

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ theme: 'light' })
  })

  describe('getSystemTheme', () => {
    it('returns dark when the system prefers dark', () => {
      mockMatchMedia(true)
      expect(getSystemTheme()).toBe('dark')
    })

    it('returns light when the system prefers light', () => {
      mockMatchMedia(false)
      expect(getSystemTheme()).toBe('light')
    })

    it('returns light when matchMedia is unavailable', () => {
      Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined })
      expect(getSystemTheme()).toBe('light')
    })
  })

  describe('persist — localStorage', () => {
    it('respects persisted dark theme ignoring system light preference', async () => {
      mockMatchMedia(false)
      localStorage.setItem('theme-preference', JSON.stringify({ state: { theme: 'dark' }, version: 0 }))
      await useThemeStore.persist.rehydrate()
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('persists the theme after toggling', () => {
      useThemeStore.setState({ theme: 'light' })
      useThemeStore.getState().toggleTheme()
      const stored = JSON.parse(localStorage.getItem('theme-preference') || '{}')
      expect(stored.state.theme).toBe('dark')
    })
  })

  describe('toggleTheme', () => {
    it('switches from light to dark', () => {
      useThemeStore.setState({ theme: 'light' })
      useThemeStore.getState().toggleTheme()
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('switches from dark to light', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().toggleTheme()
      expect(useThemeStore.getState().theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('sets an explicit theme', () => {
      useThemeStore.getState().setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
    })
  })
})
