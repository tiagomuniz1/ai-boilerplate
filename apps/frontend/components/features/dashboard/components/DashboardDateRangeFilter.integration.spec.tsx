import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DashboardDateRangeFilter } from './DashboardDateRangeFilter'

describe('DashboardDateRangeFilter', () => {
  it('renders from and to inputs with initial values', () => {
    renderWithProviders(
      <DashboardDateRangeFilter from="2026-01-01" to="2026-01-31" onChange={jest.fn()} />,
    )
    expect(screen.getByTestId('dashboard-date-range')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-date-from')).toHaveValue('2026-01-01')
    expect(screen.getByTestId('dashboard-date-to')).toHaveValue('2026-01-31')
  })

  it('calls onChange when from date changes', () => {
    const onChange = jest.fn()
    renderWithProviders(
      <DashboardDateRangeFilter from="2026-01-01" to="2026-01-31" onChange={onChange} />,
    )
    fireEvent.change(screen.getByTestId('dashboard-date-from'), {
      target: { value: '2026-01-05' },
    })
    expect(onChange).toHaveBeenCalledWith('2026-01-05', '2026-01-31')
  })

  it('calls onChange when to date changes', () => {
    const onChange = jest.fn()
    renderWithProviders(
      <DashboardDateRangeFilter from="2026-01-01" to="2026-01-31" onChange={onChange} />,
    )
    fireEvent.change(screen.getByTestId('dashboard-date-to'), {
      target: { value: '2026-01-20' },
    })
    expect(onChange).toHaveBeenCalledWith('2026-01-01', '2026-01-20')
  })
})
