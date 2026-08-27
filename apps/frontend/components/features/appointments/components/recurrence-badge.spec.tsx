import { render, screen } from '@testing-library/react'
import { RecurrenceBadge } from './recurrence-badge'

describe('RecurrenceBadge', () => {
  it('renders the session position as text', () => {
    render(<RecurrenceBadge sequence={3} total={10} data-testid="series-badge" />)

    expect(screen.getByTestId('series-badge')).toHaveTextContent('Sessão 3 de 10')
  })

  it('renders icon-only in compact mode, keeping the label accessible', () => {
    render(<RecurrenceBadge sequence={2} total={4} compact data-testid="series-badge" />)

    const badge = screen.getByTestId('series-badge')
    expect(badge).not.toHaveTextContent('Sessão 2 de 4')
    expect(badge).toHaveAttribute('aria-label', 'Sessão 2 de 4')
    expect(badge).toHaveAttribute('title', 'Sessão 2 de 4')
  })

  it('accepts extra classes', () => {
    render(<RecurrenceBadge sequence={1} total={2} className="text-accent" data-testid="series-badge" />)

    expect(screen.getByTestId('series-badge')).toHaveClass('text-accent')
  })
})
