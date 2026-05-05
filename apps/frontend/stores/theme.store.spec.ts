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
    it('returns dark when system prefers dark and no preference saved', () => {
      mockMatchMedia(true)
      expect(getSystemTheme()).toBe('dark')
    })

    it('returns light when system prefers light and no preference saved', () => {
      mockMatchMedia(false)
      expect(getSystemTheme()).toBe('light')
    })
  })

  describe('persist — localStorage', () => {
    it('respects persisted dark theme from localStorage ignoring system light preference', async () => {
      mockMatchMedia(false)
      localStorage.setItem('theme-preference', JSON.stringify({ state: { theme: 'dark' }, version: 0 }))
      await useThemeStore.persist.rehydrate()
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('respects persisted light theme from localStorage ignoring system dark preference', async () => {
      mockMatchMedia(true)
      localStorage.setItem('theme-preference', JSON.stringify({ state: { theme: 'light' }, version: 0 }))
      await useThemeStore.persist.rehydrate()
      expect(useThemeStore.getState().theme).toBe('light')
    })

    it('toggleTheme from light to dark persists new theme to localStorage', () => {
      useThemeStore.setState({ theme: 'light' })
      useThemeStore.getState().toggleTheme()
      const stored = JSON.parse(localStorage.getItem('theme-preference') || '{}')
      expect(stored.state.theme).toBe('dark')
    })

    it('toggleTheme from dark to light persists new theme to localStorage', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().toggleTheme()
      const stored = JSON.parse(localStorage.getItem('theme-preference') || '{}')
      expect(stored.state.theme).toBe('light')
    })
  })

  describe('toggleTheme', () => {
    it('switches theme from light to dark', () => {
      useThemeStore.setState({ theme: 'light' })
      useThemeStore.getState().toggleTheme()
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('switches theme from dark to light', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().toggleTheme()
      expect(useThemeStore.getState().theme).toBe('light')
    })
  })

  describe('setTheme', () => {
    it('sets theme to dark', () => {
      useThemeStore.getState().setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('sets theme to light', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().setTheme('light')
      expect(useThemeStore.getState().theme).toBe('light')
    })
  })
})
