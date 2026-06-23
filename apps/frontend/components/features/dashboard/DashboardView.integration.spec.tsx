jest.mock('./hooks/use-dashboard-stats.hook')
jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'pulso' }),
}))

import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { useDashboardStats } from './hooks/use-dashboard-stats.hook'
import { DashboardView } from './DashboardView'
import type { IDashboardModel } from './types/dashboard.types'

const mockUseDashboardStats = useDashboardStats as jest.MockedFunction<typeof useDashboardStats>

const fakeData: IDashboardModel = {
  period: { from: new Date('2026-01-01'), to: new Date('2026-01-31') },
  kpi: { scheduled: 10, confirmed: 4, completed: 8, noShow: 2 },
  patients: { total: 20, newPatients: 12, returningPatients: 8, byGender: { male: 9, female: 11 } },
  procedures: { total: 5, items: [{ label: 'Cardiologia', value: 5 }] },
  insurance: { total: 8, particular: 5, convenio: 3 },
  duration: { averageMinutes: 42, byInsuranceType: { particular: 6, convenio: 2 } },
  appointmentsByDay: [{ date: new Date('2026-01-15'), count: 3 }],
  ageDistribution: [{ age: 30, count: 5 }],
  todayBirthdays: [{ patientId: 'p1', fullName: 'Ana Costa', age: 32 }],
}

describe('DashboardView', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders loading state', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: true, isError: false, data: undefined } as any)
    renderWithProviders(<DashboardView />)
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
  })

  it('renders error state', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: false, isError: true, data: undefined } as any)
    renderWithProviders(<DashboardView />)
    expect(screen.getByTestId('dashboard-error')).toBeInTheDocument()
  })

  it('renders data when successful', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: false, isError: false, data: fakeData } as any)
    renderWithProviders(<DashboardView />)
    expect(screen.getByTestId('dashboard-kpi-scheduled')).toHaveTextContent('10')
    expect(screen.getByTestId('dashboard-patients-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-procedures-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-insurance-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-duration-card')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-timeline-chart')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-age-distribution')).toBeInTheDocument()
    expect(screen.getByTestId('dashboard-birthdays')).toBeInTheDocument()
  })

  it('renders the date range filter', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: false, isError: false, data: fakeData } as any)
    renderWithProviders(<DashboardView />)
    expect(screen.getByTestId('dashboard-date-range')).toBeInTheDocument()
  })

  it('calls hook with updated dates when filter changes', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: false, isError: false, data: fakeData } as any)
    renderWithProviders(<DashboardView />)

    fireEvent.change(screen.getByTestId('dashboard-date-from'), {
      target: { value: '2026-01-10' },
    })

    expect(mockUseDashboardStats).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-01-10' }),
    )
  })

  it('does not render success content while loading', () => {
    mockUseDashboardStats.mockReturnValue({ isLoading: true, isError: false, data: undefined } as any)
    renderWithProviders(<DashboardView />)
    expect(screen.queryByTestId('dashboard-kpi-scheduled')).not.toBeInTheDocument()
  })
})
