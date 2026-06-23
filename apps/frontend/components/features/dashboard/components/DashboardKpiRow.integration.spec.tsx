import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DashboardKpiRow } from './DashboardKpiRow'

const kpi = { scheduled: 10, confirmed: 4, completed: 8, noShow: 2 }

describe('DashboardKpiRow', () => {
  it('renders all four KPI values', () => {
    renderWithProviders(<DashboardKpiRow kpi={kpi} />)
    expect(screen.getByTestId('dashboard-kpi-scheduled')).toHaveTextContent('10')
    expect(screen.getByTestId('dashboard-kpi-confirmed')).toHaveTextContent('4')
    expect(screen.getByTestId('dashboard-kpi-completed')).toHaveTextContent('8')
    expect(screen.getByTestId('dashboard-kpi-no-show')).toHaveTextContent('2')
  })

  it('renders kpi labels', () => {
    renderWithProviders(<DashboardKpiRow kpi={kpi} />)
    expect(screen.getByText('Agendados')).toBeInTheDocument()
    expect(screen.getByText('Confirmados')).toBeInTheDocument()
    expect(screen.getByText('Atendidos')).toBeInTheDocument()
    expect(screen.getByText('Faltaram')).toBeInTheDocument()
  })
})
