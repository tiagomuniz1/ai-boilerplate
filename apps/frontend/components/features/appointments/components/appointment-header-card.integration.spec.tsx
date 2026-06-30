import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, PatientGender } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { AppointmentHeaderCard } from './appointment-header-card'
import type { IAppointmentDetailModel } from '../types/appointment-model.types'

function makeAppointment(overrides: Partial<IAppointmentDetailModel> = {}): IAppointmentDetailModel {
  return {
    id: 'appt-uuid',
    doctorId: 'doc-uuid',
    doctorName: 'Dr. João Silva',
    patientId: 'patient-uuid',
    patientName: 'Maria Santos',
    specialtyId: 'spec-uuid',
    specialtyName: 'Cardiologia',
    scheduleId: 'sched-uuid',
    date: '10/06/2026',
    startTime: '09:00',
    endTime: '09:30',
    status: AppointmentStatus.SCHEDULED,
    reason: 'Dor no peito',
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      fullName: 'Maria Santos',
      email: 'maria@example.com',
      phoneNumber: '11912345678',
      birthDate: new Date('1990-01-01'),
      documentNumber: '12345678901',
      gender: PatientGender.FEMALE,
    },
    ...overrides,
  }
}

const defaultProps = {
  appointment: makeAppointment(),
  canManage: true,
  canAct: true,
  hasRecord: false,
  onFillRecord: jest.fn(),
  onCancel: jest.fn(),
  onComplete: jest.fn(),
  isPendingComplete: false,
  isPendingCancel: false,
}

describe('AppointmentHeaderCard', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders appointment info fields', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} />)
    expect(screen.getByTestId('appointment-detail-doctor')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('appointment-detail-date')).toHaveTextContent('10/06/2026')
    expect(screen.getByTestId('appointment-detail-time')).toHaveTextContent('09:00 – 09:30')
    expect(screen.getByTestId('appointment-detail-specialty')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('appointment-detail-reason')).toHaveTextContent('Dor no peito')
  })

  it('renders status badge with correct label', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} />)
    expect(screen.getByTestId('appointment-detail-status')).toHaveTextContent('Agendada')
  })

  it('renders cancel and complete buttons when canAct is true', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} />)
    expect(screen.getByTestId('appointment-detail-cancel-button')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-detail-complete-button')).toBeInTheDocument()
  })

  it('does not render cancel and complete buttons when canAct is false', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} canAct={false} />)
    expect(screen.queryByTestId('appointment-detail-cancel-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('appointment-detail-complete-button')).not.toBeInTheDocument()
  })

  it('renders fill record button when canManage and no record', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} canAct={false} hasRecord={false} />)
    expect(screen.getByTestId('header-fill-record-button')).toBeInTheDocument()
  })

  it('hides fill record button when record exists', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} hasRecord={true} />)
    expect(screen.queryByTestId('header-fill-record-button')).not.toBeInTheDocument()
  })

  it('hides fill record button when canManage is false', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} canManage={false} hasRecord={false} canAct={false} />)
    expect(screen.queryByTestId('header-fill-record-button')).not.toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const onCancel = jest.fn()
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} onCancel={onCancel} />)
    await userEvent.click(screen.getByTestId('appointment-detail-cancel-button'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('calls onComplete when complete button is clicked', async () => {
    const onComplete = jest.fn()
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} onComplete={onComplete} />)
    await userEvent.click(screen.getByTestId('appointment-detail-complete-button'))
    expect(onComplete).toHaveBeenCalled()
  })

  it('calls onFillRecord when fill record button is clicked', async () => {
    const onFillRecord = jest.fn()
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} canAct={false} hasRecord={false} onFillRecord={onFillRecord} />)
    await userEvent.click(screen.getByTestId('header-fill-record-button'))
    expect(onFillRecord).toHaveBeenCalled()
  })

  it('does not render cancellation reason when null', () => {
    renderWithProviders(<AppointmentHeaderCard {...defaultProps} />)
    expect(screen.queryByTestId('appointment-detail-cancellation-reason')).not.toBeInTheDocument()
  })

  it('renders cancellation reason when present', () => {
    renderWithProviders(
      <AppointmentHeaderCard
        {...defaultProps}
        appointment={makeAppointment({ cancellationReason: 'Paciente desmarcou' })}
      />,
    )
    expect(screen.getByTestId('appointment-detail-cancellation-reason')).toHaveTextContent(
      'Paciente desmarcou',
    )
  })
})
