import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from './navbar'
import { NAV_LINKS } from '@/lib/constants'
import { useThemeStore } from '@/stores/theme.store'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('Navbar (integration)', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'light' })
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders every anchor link pointing at its section', () => {
    render(<Navbar />)
    NAV_LINKS.forEach((link) => {
      expect(screen.getByRole('link', { name: link.label })).toHaveAttribute('href', link.href)
    })
  })

  it('opens the access request modal from the CTA', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByTestId('nav-cta'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })

  it('toggles the theme from the navbar', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    await user.click(screen.getByTestId('theme-toggle'))
    expect(useThemeStore.getState().theme).toBe('dark')
  })
})
