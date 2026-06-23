import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientsChartCard } from './PatientsChartCard'

const patients = { total: 20, newPatients: 12, returningPatients: 8, byGender: { male: 9, female: 11 } }

describe('PatientsChartCard', () => {
  it('renders patient counts', () => {
    renderWithProviders(<PatientsChartCard patients={patients} />)
    expect(screen.getByTestId('dashboard-patients-chart')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows empty state when total is 0', () => {
    renderWithProviders(
      <PatientsChartCard patients={{ total: 0, newPatients: 0, returningPatients: 0, byGender: { male: 0, female: 0 } }} />,
    )
    expect(screen.getByText('Sem dados no período')).toBeInTheDocument()
  })
})
