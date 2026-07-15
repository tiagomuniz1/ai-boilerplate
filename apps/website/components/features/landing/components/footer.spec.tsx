import { render, screen } from '@testing-library/react'
import { Footer } from './footer'

describe('Footer', () => {
  it('renders the tagline and link columns', () => {
    render(<Footer />)
    expect(screen.getByText('Pulso — sistema de gestão para clínicas.')).toBeInTheDocument()
    expect(screen.getByText('PRODUTO')).toBeInTheDocument()
    expect(screen.getByText('SUPORTE')).toBeInTheDocument()
    expect(screen.getByText('© Pulso. Todos os direitos reservados.')).toBeInTheDocument()
  })

  it('links Contato to the support mailbox', () => {
    render(<Footer />)
    expect(screen.getByRole('link', { name: 'Contato' })).toHaveAttribute(
      'href',
      'mailto:contato@pulso.center',
    )
  })
})
