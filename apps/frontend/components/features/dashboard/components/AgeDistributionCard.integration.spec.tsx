import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AgeDistributionCard } from './AgeDistributionCard'

describe('AgeDistributionCard', () => {
  it('renders chart when data exists', () => {
    renderWithProviders(
      <AgeDistributionCard ageDistribution={[{ age: 30, count: 5 }, { age: 40, count: 3 }]} />,
    )
    expect(screen.getByTestId('dashboard-age-distribution')).toBeInTheDocument()
  })

  it('shows empty state when array is empty', () => {
    renderWithProviders(<AgeDistributionCard ageDistribution={[]} />)
    expect(screen.getByText('Sem dados de distribuição etária')).toBeInTheDocument()
  })
})
