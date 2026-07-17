import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from './navbar'
import { NAV_LINKS } from '@/lib/constants'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('Navbar (integration)', () => {
  beforeEach(() => {
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
})
