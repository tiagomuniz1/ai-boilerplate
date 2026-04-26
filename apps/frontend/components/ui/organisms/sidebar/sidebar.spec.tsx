import { render, screen } from '@testing-library/react'
import { Sidebar, SidebarItem } from './sidebar'

describe('Sidebar', () => {
    it('renders as aside element', () => {
        render(<Sidebar />)
        expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('applies w-64 when not collapsed', () => {
        render(<Sidebar />)
        expect(screen.getByRole('complementary')).toHaveClass('w-64')
    })

    it('applies w-16 when collapsed', () => {
        render(<Sidebar isCollapsed />)
        expect(screen.getByRole('complementary')).toHaveClass('w-16')
    })

    it('sets data-collapsed attribute', () => {
        render(<Sidebar isCollapsed />)
        expect(screen.getByRole('complementary')).toHaveAttribute('data-collapsed', 'true')
    })

    it('renders children', () => {
        render(<Sidebar><span data-testid="child">Item</span></Sidebar>)
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('merges className prop', () => {
        render(<Sidebar className="custom-class" />)
        expect(screen.getByRole('complementary')).toHaveClass('custom-class')
    })
})

describe('SidebarItem', () => {
    it('renders label', () => {
        render(<SidebarItem label="Dashboard" />)
        expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
        render(<SidebarItem label="Dashboard" icon={<span data-testid="icon" />} />)
        expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('applies aria-current when active', () => {
        render(<SidebarItem label="Dashboard" isActive />)
        expect(screen.getByRole('button')).toHaveAttribute('aria-current', 'page')
    })

    it('does not apply aria-current when not active', () => {
        render(<SidebarItem label="Dashboard" />)
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-current')
    })

    it('applies active classes when isActive', () => {
        render(<SidebarItem label="Dashboard" isActive />)
        expect(screen.getByRole('button')).toHaveClass('text-primary')
    })
})
