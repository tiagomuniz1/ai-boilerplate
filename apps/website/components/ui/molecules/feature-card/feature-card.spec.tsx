import { render, screen } from '@testing-library/react'
import { FeatureCard } from './feature-card'

describe('FeatureCard', () => {
  it('renders the number, title and description', () => {
    render(<FeatureCard number="01" title="Agenda" description="tempo real" />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
    expect(screen.getByText('tempo real')).toBeInTheDocument()
  })
})
