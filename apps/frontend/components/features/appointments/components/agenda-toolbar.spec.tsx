import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { AgendaToolbar } from './agenda-toolbar'

const fixedDate = new Date('2025-06-09T12:00:00.000Z') // Monday

const defaultProps = {
  currentDate: fixedDate,
  view: 'day' as const,
  onDateChange: jest.fn(),
  onViewChange: jest.fn(),
  role: UserRole.ADMIN,
  selectedDoctorId: null,
  onDoctorChange: jest.fn(),
}

describe('AgendaToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders toolbar', () => {
    render(<AgendaToolbar {...defaultProps} />)
    expect(screen.getByTestId('agenda-toolbar')).toBeInTheDocument()
  })

  it('goBack moves date back by 1 day in day view', async () => {
    render(<AgendaToolbar {...defaultProps} view="day" />)

    await userEvent.click(screen.getByTestId('toolbar-prev'))

    expect(defaultProps.onDateChange).toHaveBeenCalledTimes(1)
    const newDate = defaultProps.onDateChange.mock.calls[0][0] as Date
    expect(newDate.getDate()).toBe(fixedDate.getDate() - 1)
  })

  it('goBack moves date back by 7 days in week view', async () => {
    render(<AgendaToolbar {...defaultProps} view="week" />)

    await userEvent.click(screen.getByTestId('toolbar-prev'))

    expect(defaultProps.onDateChange).toHaveBeenCalledTimes(1)
    const newDate = defaultProps.onDateChange.mock.calls[0][0] as Date
    const expectedDate = new Date(fixedDate)
    expectedDate.setDate(expectedDate.getDate() - 7)
    expect(newDate.getDate()).toBe(expectedDate.getDate())
  })

  it('goToday calls onDateChange with today', async () => {
    render(<AgendaToolbar {...defaultProps} />)

    await userEvent.click(screen.getByTestId('toolbar-today'))

    expect(defaultProps.onDateChange).toHaveBeenCalledTimes(1)
    const newDate = defaultProps.onDateChange.mock.calls[0][0] as Date
    const today = new Date()
    expect(newDate.getDate()).toBe(today.getDate())
    expect(newDate.getMonth()).toBe(today.getMonth())
    expect(newDate.getFullYear()).toBe(today.getFullYear())
  })

  it('shows doctor selector for ADMIN', () => {
    render(
      <AgendaToolbar
        {...defaultProps}
        role={UserRole.ADMIN}
        doctors={[
          { id: 'd1', user: { id: 'u1', fullName: 'Dr. A', email: 'a@a.com' }, crmNumber: '123', specialties: [], bio: null, createdAt: new Date(), updatedAt: new Date() },
        ]}
      />,
    )
    expect(screen.getByTestId('toolbar-doctor-selector')).toBeInTheDocument()
  })

  it('does not show doctor selector for DOCTOR role (doctors prop undefined)', () => {
    render(<AgendaToolbar {...defaultProps} role={UserRole.DOCTOR} doctors={undefined} />)
    expect(screen.queryByTestId('toolbar-doctor-selector')).not.toBeInTheDocument()
  })

  it('shows block time button for DOCTOR', () => {
    render(<AgendaToolbar {...defaultProps} role={UserRole.DOCTOR} />)
    expect(screen.getByTestId('toolbar-block-time')).toBeInTheDocument()
  })

  it('block time button is enabled for DOCTOR (no selectedDoctorId requirement)', () => {
    render(<AgendaToolbar {...defaultProps} role={UserRole.DOCTOR} selectedDoctorId={null} />)
    expect(screen.getByTestId('toolbar-block-time')).not.toBeDisabled()
  })

  it('block time button is disabled for ADMIN when no doctor is selected', () => {
    render(<AgendaToolbar {...defaultProps} role={UserRole.ADMIN} selectedDoctorId={null} />)
    expect(screen.getByTestId('toolbar-block-time')).toBeDisabled()
  })

  it('block time button is enabled for ADMIN when doctor is selected', () => {
    render(<AgendaToolbar {...defaultProps} role={UserRole.ADMIN} selectedDoctorId="d1" />)
    expect(screen.getByTestId('toolbar-block-time')).not.toBeDisabled()
  })

  it('shows week date range label in week view', () => {
    render(<AgendaToolbar {...defaultProps} view="week" />)
    const label = screen.getByTestId('toolbar-date-label').textContent
    expect(label).toBeTruthy()
    expect(label).toContain('–')
  })

  it('shows day date label in day view', () => {
    render(<AgendaToolbar {...defaultProps} view="day" />)
    const label = screen.getByTestId('toolbar-date-label').textContent
    expect(label).toBeTruthy()
  })
})
