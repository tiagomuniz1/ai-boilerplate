import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Hero } from './hero'
import { useAccessRequestModalStore } from '@/stores/access-request-modal.store'

describe('Hero', () => {
  beforeEach(() => {
    useAccessRequestModalStore.setState({ isOpen: false })
  })

  it('renders the headline and microcopy', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', {
        name: 'Gestão clínica com a confiança que a medicina exige.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Acesso mediante aprovação. Sem cadastro aberto.')).toBeInTheDocument()
  })

  it('opens the access request modal from the primary CTA', async () => {
    const user = userEvent.setup()
    render(<Hero />)
    await user.click(screen.getByTestId('hero-cta'))
    expect(useAccessRequestModalStore.getState().isOpen).toBe(true)
  })

  it('has a secondary CTA anchoring to #recursos', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: 'Ver recursos' })).toHaveAttribute('href', '#recursos')
  })

  it('renders the product screenshot', () => {
    render(<Hero />)
    expect(
      screen.getByAltText('Agenda semanal do Pulso, com as consultas de cada médico organizadas por dia e status.'),
    ).toBeInTheDocument()
  })
})
