import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { InsuranceChartCard, formatInsuranceTooltip } from './InsuranceChartCard'

describe('InsuranceChartCard', () => {
  it('renders with data', () => {
    renderWithProviders(
      <InsuranceChartCard insurance={{ total: 10, particular: 7, convenio: 3 }} />,
    )
    expect(screen.getByTestId('dashboard-insurance-chart')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows empty state when total is 0', () => {
    renderWithProviders(<InsuranceChartCard insurance={{ total: 0, particular: 0, convenio: 0 }} />)
    expect(screen.getByText('Sem dados de convênio')).toBeInTheDocument()
  })
})

describe('formatInsuranceTooltip', () => {
  it('returns the value and name as a tuple', () => {
    expect(formatInsuranceTooltip(7, 'Particular')).toEqual([7, 'Particular'])
  })
})
