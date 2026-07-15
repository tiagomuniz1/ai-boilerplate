import { render, screen } from '@testing-library/react'
import { TrustBadge } from './trust-badge'

describe('TrustBadge', () => {
  it('renders its label', () => {
    render(<TrustBadge>Base ANVISA</TrustBadge>)
    expect(screen.getByText('Base ANVISA')).toBeInTheDocument()
  })
})
