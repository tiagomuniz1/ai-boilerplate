import { render, screen } from '@testing-library/react'
import { Typography } from './typography'

describe('Typography', () => {
    it('renders body variant as p by default', () => {
        render(<Typography>Texto</Typography>)
        expect(screen.getByText('Texto').tagName).toBe('P')
    })

    it('renders h1 variant as h1', () => {
        render(<Typography variant="h1">Título</Typography>)
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Título')
    })

    it('renders h2 variant as h2', () => {
        render(<Typography variant="h2">Título</Typography>)
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Título')
    })

    it('renders caption variant as span', () => {
        render(<Typography variant="caption">Legenda</Typography>)
        expect(screen.getByText('Legenda').tagName).toBe('SPAN')
    })

    it('overrides tag via as prop', () => {
        render(<Typography variant="body" as="div">Texto</Typography>)
        expect(screen.getByText('Texto').tagName).toBe('DIV')
    })

    it('merges className prop', () => {
        render(<Typography className="custom-class">Texto</Typography>)
        expect(screen.getByText('Texto')).toHaveClass('custom-class')
    })

    it('applies h1 size class', () => {
        render(<Typography variant="h1">Título</Typography>)
        expect(screen.getByText('Título')).toHaveClass('text-3xl')
    })

    it('applies caption color class', () => {
        render(<Typography variant="caption">Legenda</Typography>)
        expect(screen.getByText('Legenda')).toHaveClass('text-text-dim')
    })
})
