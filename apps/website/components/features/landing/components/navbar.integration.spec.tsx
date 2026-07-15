import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from './navbar'
import { NAV_LINKS, REGISTER_URL } from '@/lib/constants'
import { useThemeStore } from '@/stores/theme.store'

describe('Navbar (integration)', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
  })

  it('renders every anchor link pointing at its section', () => {
    render(<Navbar />)
    NAV_LINKS.forEach((link) => {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href)
    })
  })

  it('points the CTA at the register flow', () => {
    render(<Navbar />)
    expect(screen.getByTestId('nav-cta')).toHaveAttribute('href', REGISTER_URL)
  })

  it('toggles the theme from the navbar', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByTestId('theme-toggle'))
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
