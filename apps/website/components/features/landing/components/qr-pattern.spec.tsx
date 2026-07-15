import { render, screen } from '@testing-library/react'
import { QrPattern } from './qr-pattern'
import { QR_PATTERN } from '../constants/landing-content'

describe('QrPattern', () => {
  it('renders one cell per pattern bit', () => {
    render(<QrPattern />)
    const grid = screen.getByTestId('qr-pattern')
    expect(grid.children).toHaveLength(QR_PATTERN.length)
  })

  it('fills the cells whose bit is 1', () => {
    render(<QrPattern />)
    const grid = screen.getByTestId('qr-pattern')
    const filled = Array.from(grid.children).filter((cell) =>
      cell.className.includes('bg-ink'),
    )
    expect(filled).toHaveLength(QR_PATTERN.filter((bit) => bit === 1).length)
  })
})
