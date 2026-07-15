import { render, screen } from '@testing-library/react'
import { Logo } from './logo'

describe('Logo', () => {
  it('renders the wordmark by default (md size)', () => {
    render(<Logo />)
    const word = screen.getByText('pulso')
    expect(word).toBeInTheDocument()
    expect(word).toHaveClass('text-4xl')
  })

  it('renders the smaller wordmark for size sm', () => {
    render(<Logo size="sm" />)
    expect(screen.getByText('pulso')).toHaveClass('text-2xl')
  })

  it('forwards an extra className to the wrapper', () => {
    const { container } = render(<Logo className="mb-2" />)
    expect(container.firstChild).toHaveClass('mb-2')
  })
})
