import { render, screen } from '@testing-library/react'
import { StepCard } from './step-card'

describe('StepCard', () => {
  it('renders the number, title and description', () => {
    render(<StepCard number="1" title="Crie sua clínica" description="em minutos" />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Crie sua clínica')).toBeInTheDocument()
    expect(screen.getByText('em minutos')).toBeInTheDocument()
  })
})
