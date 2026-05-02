import { render, screen } from '@testing-library/react'
import { Alert } from './alert'

describe('Alert', () => {
    it('renders children', () => {
        render(<Alert>Mensagem</Alert>)
        expect(screen.getByText('Mensagem')).toBeInTheDocument()
    })

    it('renders info variant with role status by default', () => {
        render(<Alert>Info</Alert>)
        expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders error variant with role alert', () => {
        render(<Alert variant="error">Erro</Alert>)
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders warning variant with role alert', () => {
        render(<Alert variant="warning">Aviso</Alert>)
        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders success variant with role status', () => {
        render(<Alert variant="success">Sucesso</Alert>)
        expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('applies error variant border class', () => {
        render(<Alert variant="error">Erro</Alert>)
        expect(screen.getByRole('alert')).toHaveClass('border-danger')
    })

    it('applies success variant border class', () => {
        render(<Alert variant="success">Sucesso</Alert>)
        expect(screen.getByRole('status')).toHaveClass('border-good')
    })

    it('merges className prop', () => {
        render(<Alert className="custom-class">Info</Alert>)
        expect(screen.getByRole('status')).toHaveClass('custom-class')
    })
})
