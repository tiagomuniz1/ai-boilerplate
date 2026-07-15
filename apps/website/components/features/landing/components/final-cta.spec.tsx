import { render, screen } from '@testing-library/react'
import { FinalCta } from './final-cta'
import { REGISTER_URL } from '@/lib/constants'

describe('FinalCta', () => {
  it('renders the closing heading and a register CTA', () => {
    render(<FinalCta />)
    expect(
      screen.getByRole('heading', {
        name: 'Sua clínica organizada, seus dados seguros. Comece agora.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('final-cta')).toHaveAttribute('href', REGISTER_URL)
  })
})
