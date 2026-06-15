import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import { useCurrentClinic } from '@/components/features/clinics/hooks/use-current-clinic.hook'
import type { INavigationItemViewModel } from '@/types/navigation.types'

jest.mock('@/hooks/use-sidebar-navigation.hook')
jest.mock('@/components/features/clinics/hooks/use-current-clinic.hook')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

const mockUseCurrentClinic = useCurrentClinic as jest.MockedFunction<typeof useCurrentClinic>

const mockItems: INavigationItemViewModel[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <span data-testid="dashboard-icon" />,
    isActive: true,
  },
  {
    id: 'users',
    label: 'Usuários',
    href: '/users',
    icon: <span data-testid="users-icon" />,
    isActive: false,
  },
]

const mockUser = { id: 'uuid-1', fullName: 'Alice Costa', email: 'alice@example.com' }

const mockUseSidebarNavigation = useSidebarNavigation as jest.MockedFunction<typeof useSidebarNavigation>

describe('Sidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: null })
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems })
    mockUseCurrentClinic.mockReturnValue({ data: undefined } as any)
    ;(usePathname as jest.Mock).mockReturnValue('/minha-clinica/dashboard')
  })

  it('renders as an aside element', () => {
    render(<Sidebar />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('has the sidebar data-testid', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('applies w-64', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toHaveClass('w-64')
  })

  it('renders the logo', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument()
  })

  it('shows "Umi" as fallback name when no clinic is loaded', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-clinic-name')).toHaveTextContent('Umi')
  })

  it('shows clinic name when clinic data is available', () => {
    mockUseCurrentClinic.mockReturnValue({ data: { id: 'c1', name: 'Clínica do Coração' } } as any)
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-clinic-name')).toHaveTextContent('Clínica do Coração')
  })

  it('shows first letter of clinic name in logo icon when no logoUrl', () => {
    mockUseCurrentClinic.mockReturnValue({ data: { id: 'c1', name: 'Clínica do Coração', logoUrl: null } } as any)
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-logo')).toHaveTextContent('C')
  })

  it('shows "U" in logo icon when no clinic is loaded', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-logo')).toHaveTextContent('U')
  })

  it('shows "Backoffice" when on a /backoffice path', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/backoffice/clinics')
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-clinic-name')).toHaveTextContent('Backoffice')
  })

  it('shows "B" in logo icon on backoffice path', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/backoffice/clinics')
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-logo')).toHaveTextContent('B')
  })

  it('renders <img> with logoUrl when clinic has a logo', () => {
    const logoUrl = 'https://s3.amazonaws.com/clinics/uuid-1/logo.jpg'
    mockUseCurrentClinic.mockReturnValue({
      data: { id: 'c1', name: 'Clínica do Coração', logoUrl },
    } as any)
    render(<Sidebar />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', logoUrl)
    expect(img).toHaveAttribute('alt', 'Clínica do Coração')
  })

  it('hides clinic name when logo is present', () => {
    mockUseCurrentClinic.mockReturnValue({
      data: { id: 'c1', name: 'Clínica do Coração', logoUrl: 'https://s3.amazonaws.com/logo.jpg' },
    } as any)
    render(<Sidebar />)
    expect(screen.queryByTestId('sidebar-clinic-name')).not.toBeInTheDocument()
  })

  it('renders letter initial instead of <img> when logoUrl is null', () => {
    mockUseCurrentClinic.mockReturnValue({ data: { id: 'c1', name: 'Clínica do Coração', logoUrl: null } } as any)
    render(<Sidebar />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('sidebar-logo')).toHaveTextContent('C')
  })

  it('renders letter initial when clinic data is undefined (loading)', () => {
    mockUseCurrentClinic.mockReturnValue({ data: undefined } as any)
    render(<Sidebar />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('sidebar-logo')).toHaveTextContent('U')
  })

  it('renders a nav element', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument()
  })

  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-item-dashboard')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-item-users')).toBeInTheDocument()
  })

  it('shows item labels', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Usuários')).toBeInTheDocument()
  })

  it('does not render the toggle button', () => {
    render(<Sidebar />)
    expect(screen.queryByTestId('sidebar-toggle')).not.toBeInTheDocument()
  })

  it('does not render user footer when no user is logged in', () => {
    render(<Sidebar />)
    expect(screen.queryByTestId('sidebar-user')).not.toBeInTheDocument()
  })

  it('renders user footer when user is logged in', () => {
    useAuthStore.setState({ user: mockUser })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user')).toBeInTheDocument()
  })

  it('shows user initials in avatar', () => {
    useAuthStore.setState({ user: mockUser })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user-avatar')).toHaveTextContent('AC')
  })

  it('shows single initial for single-word name', () => {
    useAuthStore.setState({ user: { ...mockUser, fullName: 'Alice' } })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user-avatar')).toHaveTextContent('A')
  })

  it('shows user name and email', () => {
    useAuthStore.setState({ user: mockUser })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user-info')).toBeInTheDocument()
    expect(screen.getByText('Alice Costa')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('marks the active item with aria-current', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-item-dashboard')).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive items with aria-current', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-item-users')).not.toHaveAttribute('aria-current')
  })
})
