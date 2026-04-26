import { render, screen } from '@testing-library/react'
import { Icon } from './icon'

describe('Icon', () => {
    it('renders svg element', () => {
        const { container } = render(<Icon />)
        expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('applies md size by default (20px)', () => {
        const { container } = render(<Icon />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveAttribute('width', '20')
        expect(svg).toHaveAttribute('height', '20')
    })

    it('applies lg size (24px)', () => {
        const { container } = render(<Icon size="lg" />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveAttribute('width', '24')
        expect(svg).toHaveAttribute('height', '24')
    })

    it('applies numeric size', () => {
        const { container } = render(<Icon size={32} />)
        const svg = container.querySelector('svg')
        expect(svg).toHaveAttribute('width', '32')
    })

    it('is aria-hidden by default', () => {
        const { container } = render(<Icon />)
        expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    })

    it('sets aria-label and role when aria-label is provided', () => {
        render(<Icon aria-label="Fechar" />)
        expect(screen.getByRole('img', { name: 'Fechar' })).toBeInTheDocument()
    })

    it('merges className prop', () => {
        const { container } = render(<Icon className="text-primary" />)
        expect(container.querySelector('svg')).toHaveClass('text-primary')
    })
})
