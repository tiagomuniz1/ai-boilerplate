import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DurationCard } from './DurationCard'

describe('DurationCard', () => {
  it('renders average duration', () => {
    renderWithProviders(
      <DurationCard duration={{ averageMinutes: 42, byInsuranceType: { particular: 6, convenio: 2 } }} />,
    )
    expect(screen.getByTestId('dashboard-duration-card')).toBeInTheDocument()
    expect(screen.getByText('42min')).toBeInTheDocument()
  })

  it('shows dash when averageMinutes is 0', () => {
    renderWithProviders(
      <DurationCard duration={{ averageMinutes: 0, byInsuranceType: { particular: 0, convenio: 0 } }} />,
    )
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
