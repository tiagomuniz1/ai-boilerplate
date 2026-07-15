import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './theme-toggle'
import { useThemeStore } from '@/stores/theme.store'

describe('ThemeToggle', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
  })

  it('shows "Modo escuro" while light and toggles to dark on click', async () => {
    const user = userEvent.setup()
    render(<ThemeToggle />)
    const button = screen.getByTestId('theme-toggle')
    expect(button).toHaveTextContent('Modo escuro')
    expect(button).toHaveAttribute('aria-pressed', 'false')

    await user.click(button)

    expect(useThemeStore.getState().theme).toBe('dark')
    expect(button).toHaveTextContent('Modo claro')
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('toggles back to light from dark', async () => {
    const user = userEvent.setup()
    useThemeStore.setState({ theme: 'dark' })
    render(<ThemeToggle />)
    await user.click(screen.getByTestId('theme-toggle'))
    expect(useThemeStore.getState().theme).toBe('light')
  })
})
