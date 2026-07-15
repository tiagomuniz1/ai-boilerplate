import { render } from '@testing-library/react'
import { act } from 'react'
import { useApplyTheme } from './use-apply-theme.hook'
import { useThemeStore } from '@/stores/theme.store'

function Harness() {
  useApplyTheme()
  return null
}

describe('useApplyTheme', () => {
  beforeEach(() => {
    document.documentElement.classList.remove('dark')
    useThemeStore.setState({ theme: 'light' })
  })

  it('does not add the dark class when theme is light', () => {
    render(<Harness />)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('adds the dark class when theme is dark', () => {
    useThemeStore.setState({ theme: 'dark' })
    render(<Harness />)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reacts to theme changes', () => {
    render(<Harness />)
    act(() => {
      useThemeStore.setState({ theme: 'dark' })
    })
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    act(() => {
      useThemeStore.setState({ theme: 'light' })
    })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
