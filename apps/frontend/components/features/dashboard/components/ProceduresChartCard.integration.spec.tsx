import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ProceduresChartCard } from './ProceduresChartCard'

const procedures = {
  total: 5,
  items: [
    { label: 'Cardiologia', value: 3 },
    { label: 'Ortopedia', value: 2 },
  ],
}

describe('ProceduresChartCard', () => {
  it('renders procedure items', () => {
    renderWithProviders(<ProceduresChartCard procedures={procedures} />)
    expect(screen.getByTestId('dashboard-procedures-chart')).toBeInTheDocument()
    expect(screen.getByText('Cardiologia')).toBeInTheDocument()
    expect(screen.getByText('Ortopedia')).toBeInTheDocument()
  })

  it('shows empty state when total is 0', () => {
    renderWithProviders(<ProceduresChartCard procedures={{ total: 0, items: [] }} />)
    expect(screen.getByText('Sem procedimentos no período')).toBeInTheDocument()
  })
})
