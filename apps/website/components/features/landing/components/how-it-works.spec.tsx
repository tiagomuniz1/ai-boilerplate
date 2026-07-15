import { render, screen } from '@testing-library/react'
import { HowItWorks } from './how-it-works'
import { STEPS } from '../constants/landing-content'
import { REGISTER_URL } from '@/lib/constants'

describe('HowItWorks', () => {
  it('renders the heading, the steps and a register CTA', () => {
    const { container } = render(<HowItWorks />)
    expect(container.querySelector('#como-funciona')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Comece hoje, em três passos.' })).toBeInTheDocument()
    expect(screen.getAllByTestId('step-card')).toHaveLength(STEPS.length)
    expect(screen.getByRole('link', { name: 'Criar minha clínica grátis' })).toHaveAttribute(
      'href',
      REGISTER_URL,
    )
  })
})
