import { render, screen } from '@testing-library/react'
import { Card } from './card'

describe('Card', () => {
    it('renders children', () => {
        render(<Card>Conteúdo</Card>)
        expect(screen.getByText('Conteúdo')).toBeInTheDocument()
    })

    it('renders title when provided', () => {
        render(<Card title="Detalhes">Conteúdo</Card>)
        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Detalhes')
    })

    it('does not render heading when title is not provided', () => {
        render(<Card>Conteúdo</Card>)
        expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('merges className prop', () => {
        const { container } = render(<Card className="custom-class">Conteúdo</Card>)
        expect(container.firstChild).toHaveClass('custom-class')
    })

    it('applies surface-elevated background class', () => {
        const { container } = render(<Card>Conteúdo</Card>)
        expect(container.firstChild).toHaveClass('bg-surface-elevated')
    })
})
