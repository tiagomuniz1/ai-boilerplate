import { render, screen } from '@testing-library/react'
import { Label } from './label'

describe('Label', () => {
    it('renders children', () => {
        render(<Label>Nome</Label>)
        expect(screen.getByText('Nome')).toBeInTheDocument()
    })

    it('renders required asterisk when required is true', () => {
        render(<Label required>Nome</Label>)
        expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('does not render asterisk when required is false', () => {
        render(<Label>Nome</Label>)
        expect(screen.queryByText('*')).not.toBeInTheDocument()
    })

    it('passes htmlFor to label element', () => {
        render(<Label htmlFor="name">Nome</Label>)
        expect(screen.getByText('Nome').closest('label')).toHaveAttribute('for', 'name')
    })

    it('merges className prop', () => {
        render(<Label className="custom-class">Nome</Label>)
        expect(screen.getByText('Nome').closest('label')).toHaveClass('custom-class')
    })
})
