import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CidRankingCard, formatCidTooltip } from './CidRankingCard'

const cidRanking = {
  total: 5,
  items: [
    { label: 'M54.5', value: 3 },
    { label: 'J11', value: 2 },
  ],
}

describe('CidRankingCard', () => {
  it('renders CID ranking items', () => {
    renderWithProviders(<CidRankingCard cidRanking={cidRanking} />)
    expect(screen.getByTestId('dashboard-cid-ranking-card')).toBeInTheDocument()
    expect(screen.getByText('M54.5')).toBeInTheDocument()
    expect(screen.getByText('J11')).toBeInTheDocument()
  })

  it('shows empty state when total is 0', () => {
    renderWithProviders(<CidRankingCard cidRanking={{ total: 0, items: [] }} />)
    expect(screen.getByText('Sem atestados no período')).toBeInTheDocument()
  })
})

describe('formatCidTooltip', () => {
  it('returns the value and name as a tuple', () => {
    expect(formatCidTooltip(3, 'M54.5')).toEqual([3, 'M54.5'])
  })
})
