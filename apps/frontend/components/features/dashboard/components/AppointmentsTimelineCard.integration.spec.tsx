import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AppointmentsTimelineCard } from './AppointmentsTimelineCard'

describe('AppointmentsTimelineCard', () => {
  it('renders the chart container', () => {
    const data = [
      { date: new Date('2026-01-10'), count: 5 },
      { date: new Date('2026-01-11'), count: 2 },
    ]
    renderWithProviders(<AppointmentsTimelineCard appointmentsByDay={data} />)
    expect(screen.getByTestId('dashboard-timeline-chart')).toBeInTheDocument()
  })

  it('shows empty state when all counts are zero', () => {
    renderWithProviders(<AppointmentsTimelineCard appointmentsByDay={[]} />)
    expect(screen.getByText('Sem atendimentos no período')).toBeInTheDocument()
  })
})
