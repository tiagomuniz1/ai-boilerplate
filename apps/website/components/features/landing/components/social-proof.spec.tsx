import { render, screen } from '@testing-library/react'
import { SocialProof } from './social-proof'

describe('SocialProof', () => {
  it('renders the heading and three placeholders (no invented testimonials)', () => {
    render(<SocialProof />)
    expect(
      screen.getByRole('heading', { name: 'Clínicas que confiam no Pulso.' }),
    ).toBeInTheDocument()
    const placeholders = screen.getAllByTestId('testimonial-placeholder')
    expect(placeholders).toHaveLength(3)
    placeholders.forEach((box) => {
      expect(box).toHaveTextContent('[ depoimento — em breve ]')
    })
  })
})
