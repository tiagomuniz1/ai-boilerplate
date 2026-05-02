import { render, screen } from '@testing-library/react'
import { SidebarItem } from './sidebar-item'
import type { INavigationItemViewModel } from '@/types/navigation.types'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}))

const baseItem: INavigationItemViewModel = {
  id: 'dashboard',
  label: 'Dashboard',
  href: '/dashboard',
  icon: <span data-testid="nav-icon" />,
  isActive: false,
}

describe('SidebarItem', () => {
  it('renders the item label when not collapsed', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('hides the label when collapsed', () => {
    render(<SidebarItem item={baseItem} isCollapsed />)
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('renders the icon when collapsed', () => {
    render(<SidebarItem item={baseItem} isCollapsed />)
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument()
  })

  it('renders the icon when expanded', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByTestId('nav-icon')).toBeInTheDocument()
  })

  it('renders as a link with correct href', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard')
  })

  it('sets aria-current when active', () => {
    render(<SidebarItem item={{ ...baseItem, isActive: true }} isCollapsed={false} />)
    expect(screen.getByRole('link')).toHaveAttribute('aria-current', 'page')
  })

  it('does not set aria-current when not active', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-current')
  })

  it('applies accent-soft background and text-text when active', () => {
    render(<SidebarItem item={{ ...baseItem, isActive: true }} isCollapsed={false} />)
    expect(screen.getByRole('link')).toHaveClass('bg-accent-soft')
    expect(screen.getByRole('link')).toHaveClass('text-text')
  })

  it('icon span gets text-accent class when active', () => {
    render(<SidebarItem item={{ ...baseItem, isActive: true }} isCollapsed={false} />)
    const iconSpan = screen.getByTestId('nav-icon').parentElement
    expect(iconSpan).toHaveClass('text-accent')
  })

  it('applies inactive styles when not active', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByRole('link')).toHaveClass('text-text-dim')
  })

  it('icon span does not have text-accent class when inactive', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    const iconSpan = screen.getByTestId('nav-icon').parentElement
    expect(iconSpan).not.toHaveClass('text-accent')
  })

  it('has correct data-testid', () => {
    render(<SidebarItem item={baseItem} isCollapsed={false} />)
    expect(screen.getByTestId('sidebar-item-dashboard')).toBeInTheDocument()
  })

  it('data-testid uses the item id', () => {
    const usersItem: INavigationItemViewModel = { ...baseItem, id: 'users', href: '/users' }
    render(<SidebarItem item={usersItem} isCollapsed={false} />)
    expect(screen.getByTestId('sidebar-item-users')).toBeInTheDocument()
  })
})
