import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
    it('renders children', () => {
        render(<Button>Save</Button>)
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
    })

    it('applies primary variant by default', () => {
        render(<Button>Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('bg-accent')
    })

    it('applies secondary variant classes', () => {
        render(<Button variant="secondary">Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('bg-surface-2')
    })

    it('applies ghost variant classes', () => {
        render(<Button variant="ghost">Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('bg-transparent')
    })

    it('applies sm size classes', () => {
        render(<Button size="sm">Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('h-8')
    })

    it('applies lg size classes', () => {
        render(<Button size="lg">Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('h-12')
    })

    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Save</Button>)
        expect(screen.getByRole('button')).toBeDisabled()
    })

    it('is disabled and shows spinner when isLoading is true', () => {
        render(<Button isLoading>Save</Button>)
        const btn = screen.getByRole('button')
        expect(btn).toBeDisabled()
        expect(btn).toHaveAttribute('aria-busy', 'true')
        expect(btn.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('calls onClick when clicked', async () => {
        const onClick = jest.fn()
        render(<Button onClick={onClick}>Save</Button>)
        await userEvent.click(screen.getByRole('button'))
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled', async () => {
        const onClick = jest.fn()
        render(<Button disabled onClick={onClick}>Save</Button>)
        await userEvent.click(screen.getByRole('button'))
        expect(onClick).not.toHaveBeenCalled()
    })

    it('merges className prop', () => {
        render(<Button className="custom-class">Save</Button>)
        expect(screen.getByRole('button')).toHaveClass('custom-class')
    })

    it('forwards ref', () => {
        const ref = { current: null }
        render(<Button ref={ref}>Save</Button>)
        expect(ref.current).not.toBeNull()
    })
})
