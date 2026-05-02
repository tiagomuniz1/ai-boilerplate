import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidebarToggle } from './sidebar-toggle'

describe('SidebarToggle', () => {
  it('renders the toggle button', () => {
    render(<SidebarToggle isCollapsed={false} onToggle={jest.fn()} />)
    expect(screen.getByTestId('sidebar-toggle')).toBeInTheDocument()
  })

  it('has aria-label to expand when collapsed', () => {
    render(<SidebarToggle isCollapsed onToggle={jest.fn()} />)
    expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute('aria-label', 'Expandir sidebar')
  })

  it('has aria-label to collapse when expanded', () => {
    render(<SidebarToggle isCollapsed={false} onToggle={jest.fn()} />)
    expect(screen.getByTestId('sidebar-toggle')).toHaveAttribute('aria-label', 'Colapsar sidebar')
  })

  it('calls onToggle when clicked', async () => {
    const onToggle = jest.fn()
    render(<SidebarToggle isCollapsed={false} onToggle={onToggle} />)
    await userEvent.click(screen.getByTestId('sidebar-toggle'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('is a button element', () => {
    render(<SidebarToggle isCollapsed={false} onToggle={jest.fn()} />)
    expect(screen.getByTestId('sidebar-toggle').tagName).toBe('BUTTON')
  })
})
