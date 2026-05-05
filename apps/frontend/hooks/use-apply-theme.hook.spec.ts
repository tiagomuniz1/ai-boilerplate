import { renderHook, act } from '@testing-library/react'
import { useApplyTheme } from './use-apply-theme.hook'
import { useThemeStore } from '@/stores/theme.store'

describe('useApplyTheme', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
    document.documentElement.classList.remove('dark')
  })

  it('adds dark class to <html> when theme is dark', () => {
    act(() => useThemeStore.setState({ theme: 'dark' }))
    renderHook(() => useApplyTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from <html> when theme is light', () => {
    document.documentElement.classList.add('dark')
    act(() => useThemeStore.setState({ theme: 'light' }))
    renderHook(() => useApplyTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reacts to theme change from light to dark', () => {
    renderHook(() => useApplyTheme())
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    act(() => useThemeStore.setState({ theme: 'dark' }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reacts to theme change from dark to light', () => {
    act(() => useThemeStore.setState({ theme: 'dark' }))
    renderHook(() => useApplyTheme())
    act(() => useThemeStore.setState({ theme: 'light' }))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
