import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './sidebar'
import { useSidebarNavigation } from '@/hooks/use-sidebar-navigation.hook'
import { useAuthStore } from '@/stores/auth.store'
import type { INavigationItemViewModel } from '@/types/navigation.types'

jest.mock('@/hooks/use-sidebar-navigation.hook')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

const mockToggle = jest.fn()

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
    mockUseSidebarNavigation.mockReturnValue({
      items: mockItems,
      isCollapsed: false,
      toggle: mockToggle,
    })
  })

  it('renders as an aside element', () => {
    render(<Sidebar />)
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('has the sidebar data-testid', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('applies w-64 when not collapsed', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toHaveClass('w-64')
  })

  it('applies w-16 when collapsed', () => {
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toHaveClass('w-16')
  })

  it('sets data-collapsed to false when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false')
  })

  it('sets data-collapsed to true when collapsed', () => {
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true')
  })

  it('renders the logo', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-logo')).toBeInTheDocument()
  })

  it('shows brand name and subtitle when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByText('Umi')).toBeInTheDocument()
    expect(screen.getByText('Backoffice Clínico')).toBeInTheDocument()
  })

  it('hides brand name when collapsed', () => {
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.queryByText('Umi')).not.toBeInTheDocument()
    expect(screen.queryByText('Backoffice Clínico')).not.toBeInTheDocument()
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

  it('shows item labels when expanded', () => {
    render(<Sidebar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Usuários')).toBeInTheDocument()
  })

  it('hides item labels when collapsed', () => {
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
  })

  it('renders the toggle button', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
  })

  it('calls toggle when the toggle button is clicked', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByTestId('sidebar-toggle'))
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it('marks the active item with aria-current', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-item-dashboard')).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive items with aria-current', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-item-users')).not.toHaveAttribute('aria-current')
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

  it('shows user name and email when expanded', () => {
    useAuthStore.setState({ user: mockUser })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user-info')).toBeInTheDocument()
    expect(screen.getByText('Alice Costa')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('hides user info text when collapsed', () => {
    useAuthStore.setState({ user: mockUser })
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.queryByTestId('sidebar-user-info')).not.toBeInTheDocument()
  })

  it('shows only avatar when collapsed with user logged in', () => {
    useAuthStore.setState({ user: mockUser })
    mockUseSidebarNavigation.mockReturnValue({ items: mockItems, isCollapsed: true, toggle: mockToggle })
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar-user-avatar')).toBeInTheDocument()
    expect(screen.queryByText('Alice Costa')).not.toBeInTheDocument()
  })
})
