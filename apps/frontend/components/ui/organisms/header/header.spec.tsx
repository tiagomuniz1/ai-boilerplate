import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './header'
import { useHeaderUser } from './hooks/use-header-user.hook'
import { useLogout } from './hooks/use-logout.hook'

jest.mock('./hooks/use-header-user.hook')
jest.mock('./hooks/use-logout.hook')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

const mockUseHeaderUser = useHeaderUser as jest.MockedFunction<typeof useHeaderUser>
const mockUseLogout = useLogout as jest.MockedFunction<typeof useLogout>
const mockLogout = jest.fn()

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseHeaderUser.mockReturnValue({ user: null, isAuthenticated: false })
    mockUseLogout.mockReturnValue({ logout: mockLogout, isPending: false, error: null })
  })

  it('renders as header element', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('has data-testid="header"', () => {
    render(<Header />)
    expect(screen.getByTestId('header')).toBeInTheDocument()
  })

  it('applies border-b class', () => {
    render(<Header />)
    expect(screen.getByRole('banner')).toHaveClass('border-b')
  })

  it('renders the logo', () => {
    render(<Header />)
    expect(screen.getByTestId('header-logo')).toBeInTheDocument()
  })

  it('renders the search bar', () => {
    render(<Header />)
    expect(screen.getByTestId('header-search')).toBeInTheDocument()
  })

  it('renders the notifications button', () => {
    render(<Header />)
    expect(screen.getByTestId('header-notifications')).toBeInTheDocument()
  })

  it('notifications button has aria-label "Notificações"', () => {
    render(<Header />)
    expect(screen.getByLabelText('Notificações')).toBeInTheDocument()
  })

  it('renders the settings button', () => {
    render(<Header />)
    expect(screen.getByTestId('header-settings')).toBeInTheDocument()
  })

  it('settings button has aria-label "Configurações"', () => {
    render(<Header />)
    expect(screen.getByLabelText('Configurações')).toBeInTheDocument()
  })

  it('renders the mobile menu button', () => {
    render(<Header />)
    expect(screen.getByTestId('header-mobile-menu')).toBeInTheDocument()
  })

  it('hides user menu when not authenticated', () => {
    render(<Header />)
    expect(screen.queryByTestId('header-avatar-button')).not.toBeInTheDocument()
  })

  it('shows user menu when authenticated', () => {
    mockUseHeaderUser.mockReturnValue({
      user: { id: '1', fullName: 'Alice Costa', email: 'alice@example.com' },
      isAuthenticated: true,
    })
    render(<Header />)
    expect(screen.getByTestId('header-avatar-button')).toBeInTheDocument()
  })

  it('toggles mobile menu aria-expanded when hamburger is clicked', () => {
    render(<Header />)
    const button = screen.getByTestId('header-mobile-menu')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('calls onLogoClick when logo is clicked', () => {
    const onLogoClick = jest.fn()
    render(<Header onLogoClick={onLogoClick} />)
    fireEvent.click(screen.getByTestId('header-logo'))
    expect(onLogoClick).toHaveBeenCalledTimes(1)
  })

  it('applies default padding when variant is default', () => {
    render(<Header variant="default" />)
    expect(screen.getByRole('banner')).toHaveStyle({ padding: '18px 48px' })
  })

  it('applies compact padding when variant is compact', () => {
    render(<Header variant="compact" />)
    expect(screen.getByRole('banner')).toHaveStyle({ padding: '12px 24px' })
  })

  it('renders header-actions container', () => {
    render(<Header />)
    expect(screen.getByTestId('header-actions')).toBeInTheDocument()
  })

  it('renders notification badge', () => {
    render(<Header />)
    expect(screen.getByTestId('header-notifications-badge')).toBeInTheDocument()
  })
})
