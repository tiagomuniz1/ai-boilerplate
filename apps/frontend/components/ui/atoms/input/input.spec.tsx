import { render, screen } from '@testing-library/react'
import { Input } from './input'

describe('Input', () => {
    it('renders without label', () => {
        render(<Input placeholder="Digite aqui" />)
        expect(screen.getByPlaceholderText('Digite aqui')).toBeInTheDocument()
    })

    it('renders label and associates with input via htmlFor', () => {
        render(<Input label="Email" id="email" />)
        const label = screen.getByText('Email')
        const input = screen.getByRole('textbox')
        expect(label).toHaveAttribute('for', 'email')
        expect(input).toHaveAttribute('id', 'email')
    })

    it('generates id from label when id is not provided', () => {
        render(<Input label="Full Name" />)
        expect(screen.getByRole('textbox')).toHaveAttribute('id', 'full-name')
        expect(screen.getByText('Full Name')).toHaveAttribute('for', 'full-name')
    })

    it('displays error message and sets aria-invalid', () => {
        render(<Input label="Email" id="email" error="Email inválido" />)
        expect(screen.getByRole('alert')).toHaveTextContent('Email inválido')
        expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    })

    it('displays helper text when no error', () => {
        render(<Input id="email" helperText="Use seu email corporativo" />)
        expect(screen.getByText('Use seu email corporativo')).toBeInTheDocument()
    })

    it('does not display helper text when error is present', () => {
        render(<Input id="email" error="Erro" helperText="Helper" />)
        expect(screen.queryByText('Helper')).not.toBeInTheDocument()
    })

    it('is disabled when disabled prop is true', () => {
        render(<Input disabled />)
        expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('applies error border class when error is present', () => {
        render(<Input id="email" error="Erro" />)
        expect(screen.getByRole('textbox')).toHaveClass('border-error')
    })

    it('merges className prop', () => {
        render(<Input className="custom-class" />)
        expect(screen.getByRole('textbox')).toHaveClass('custom-class')
    })

    it('forwards ref', () => {
        const ref = { current: null }
        render(<Input ref={ref} />)
        expect(ref.current).not.toBeNull()
    })
})
