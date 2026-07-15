import { render, screen } from '@testing-library/react'
import { Hero } from './hero'
import { REGISTER_URL } from '@/lib/constants'

describe('Hero', () => {
  it('renders the headline and microcopy', () => {
    render(<Hero />)
    expect(
      screen.getByRole('heading', {
        name: 'Gestão clínica com a confiança que a medicina exige.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cadastro em minutos. Sem cartão de crédito.')).toBeInTheDocument()
  })

  it('points the primary CTA at the register flow', () => {
    render(<Hero />)
    expect(screen.getByTestId('hero-cta')).toHaveAttribute('href', REGISTER_URL)
  })

  it('has a secondary CTA anchoring to #recursos', () => {
    render(<Hero />)
    expect(screen.getByRole('link', { name: 'Ver recursos' })).toHaveAttribute('href', '#recursos')
  })
})
