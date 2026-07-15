import { render, screen } from '@testing-library/react'
import { Features } from './features'
import { FEATURES } from '../constants/landing-content'

describe('Features', () => {
  it('renders the section heading and every feature card', () => {
    const { container } = render(<Features />)
    expect(container.querySelector('#recursos')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tudo que a clínica precisa, sem sistemas soltos.' }),
    ).toBeInTheDocument()
    expect(screen.getAllByTestId('feature-card')).toHaveLength(FEATURES.length)
  })
})
