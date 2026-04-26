import { render, screen } from '@testing-library/react'
import { Header } from './header'

describe('Header', () => {
    it('renders as header element', () => {
        render(<Header />)
        expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders logo when provided', () => {
        render(<Header logo={<span data-testid="logo">Logo</span>} />)
        expect(screen.getByTestId('logo')).toBeInTheDocument()
    })

    it('renders actions when provided', () => {
        render(<Header actions={<button>Sair</button>} />)
        expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
    })

    it('renders children', () => {
        render(<Header><span data-testid="child">Nav</span></Header>)
        expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('merges className prop', () => {
        render(<Header className="custom-class" />)
        expect(screen.getByRole('banner')).toHaveClass('custom-class')
    })

    it('applies border-b class', () => {
        render(<Header />)
        expect(screen.getByRole('banner')).toHaveClass('border-b')
    })
})
