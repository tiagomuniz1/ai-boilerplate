import { render, screen } from '@testing-library/react'
import { TrustBar } from './trust-bar'
import { TRUST_ITEMS } from '../constants/landing-content'

describe('TrustBar', () => {
  it('renders every trust item', () => {
    render(<TrustBar />)
    expect(screen.getAllByTestId('trust-badge')).toHaveLength(TRUST_ITEMS.length)
    TRUST_ITEMS.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument()
    })
  })
})
