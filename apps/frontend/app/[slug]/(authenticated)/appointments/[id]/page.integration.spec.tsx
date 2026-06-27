jest.mock('@/components/features/appointments/services/appointments.service')
jest.mock('@/components/features/doctors/services/doctors.service')
jest.mock('@/components/features/medical-records/services/medical-records.service')
jest.mock('@/components/features/medical-record-templates/services/medical-record-templates.service')
jest.mock('@/stores/auth.store')
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn() })),
  useParams: jest.fn(() => ({ id: 'appt-uuid', slug: 'clinic-slug' })),
}))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, PatientGender, UserRole } from '@app/shared'
import { useRouter } from 'next/navigation'
import { appointmentsService } from '@/components/features/appointments/services/appointments.service'
import { doctorsService } from '@/components/features/doctors/services/doctors.service'
import { medicalRecordsService } from '@/components/features/medical-records/services/medical-records.service'
import { medicalRecordTemplatesService } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import AppointmentDetailPage from './page'

const mockUseRouter = useRouter as jest.Mock
const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockDoctorsService = doctorsService as jest.Mocked<typeof doctorsService>
const mockMedicalRecordsService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>
const mockTemplatesService = medicalRecordTemplatesService as jest.Mocked<typeof medicalRecordTemplatesService>
const mockUseAuthStore = useAuthStore as unknown as jest.Mock

const DOCTOR_ID = 'doctor-profile-uuid'
const DOCTOR_USER_ID = 'doctor-user-uuid'

function mockAuth(role: UserRole, userId = 'user-uuid') {
  mockUseAuthStore.mockImplementation((selector: (s: { user: object }) => unknown) =>
    selector({
      user: { id: userId, fullName: 'Test User', email: 'test@test.com', role, clinicId: 'clinic-uuid' },
    }),
  )
}

const makeDoctorsResponse = (id = DOCTOR_ID) => ({
  data: [
    {
      id,
      user: { id: DOCTOR_USER_ID, fullName: 'Dr. Test', email: 'doctor@test.com', isActive: true },
      crmNumber: '12345/SP',
      specialties: [],
      bio: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  total: 1,
  page: 1,
  limit: 100,
})

const makeAppointmentDto = (overrides: object = {}) => ({
  id: 'appt-uuid',
  doctorId: DOCTOR_ID,
  doctorName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  scheduleId: 'schedule-uuid',
  date: '2025-06-10',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  insuranceType: null,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: {
    fullName: 'Patient One',
    email: 'patient@example.com',
    phoneNumber: '11999990001',
    birthDate: '1990-05-20',
    documentNumber: '12345678901',
    gender: PatientGender.FEMALE,
  },
  ...overrides,
})

describe('AppointmentDetailPage (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth(UserRole.ADMIN)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse())
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)
    mockTemplatesService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 1 })
  })

  it('renders skeleton while loading', () => {
    mockAppointmentsService.getById.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<AppointmentDetailPage />)
    expect(screen.getByTestId('appointment-detail-skeleton')).toBeInTheDocument()
  })

  it('renders error when fetch fails', async () => {
    mockAppointmentsService.getById.mockRejectedValue({ status: 404 })
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-error')).toBeInTheDocument()
    })
  })

  it('renders appointment summary on success', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-doctor')).toBeInTheDocument()
    })
    expect(screen.getByTestId('appointment-detail-doctor')).toHaveTextContent('Dr. Test')
    expect(screen.getByTestId('appointment-detail-date')).toHaveTextContent('2025-06-10')
    expect(screen.getByTestId('appointment-detail-time')).toHaveTextContent('09:00')
    expect(screen.getByTestId('appointment-detail-status')).toHaveTextContent('Agendada')
  })

  it('renders patient info card', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('patient-info-card')).toBeInTheDocument()
    })
    expect(screen.getByTestId('patient-info-name')).toHaveTextContent('Patient One')
    expect(screen.getByTestId('patient-info-email')).toHaveTextContent('patient@example.com')
  })

  it('renders back button', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-back-button')).toBeInTheDocument()
    })
  })

  it('clicking back button calls router.back()', async () => {
    const backMock = jest.fn()
    mockUseRouter.mockReturnValue({ push: jest.fn(), back: backMock })
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => expect(screen.getByTestId('appointment-detail-back-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-detail-back-button'))
    expect(backMock).toHaveBeenCalled()
  })

  it('ADMIN sees cancel and complete buttons for SCHEDULED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-cancel-button')).toBeInTheDocument()
    })
    expect(screen.getByTestId('appointment-detail-complete-button')).toBeInTheDocument()
  })

  it('ADMIN does not see action buttons for COMPLETED appointment', async () => {
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.COMPLETED }),
    )
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-status')).toHaveTextContent('Concluída')
    })
    expect(screen.queryByTestId('appointment-detail-cancel-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('appointment-detail-complete-button')).not.toBeInTheDocument()
  })

  it('DOCTOR sees actions for own appointment', async () => {
    mockAuth(UserRole.DOCTOR, DOCTOR_USER_ID)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse(DOCTOR_ID))
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ doctorId: DOCTOR_ID }))
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-cancel-button')).toBeInTheDocument()
    })
  })

  it('DOCTOR does not see actions for another doctor appointment', async () => {
    mockAuth(UserRole.DOCTOR, DOCTOR_USER_ID)
    mockDoctorsService.getAll.mockResolvedValue(makeDoctorsResponse(DOCTOR_ID))
    mockAppointmentsService.getById.mockResolvedValue(
      makeAppointmentDto({ doctorId: 'other-doctor-id' }),
    )
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-summary')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('appointment-detail-cancel-button')).not.toBeInTheDocument()
  })

  it('USER sees no action buttons', async () => {
    mockAuth(UserRole.USER)
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-summary')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('appointment-detail-cancel-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('appointment-detail-complete-button')).not.toBeInTheDocument()
  })

  it('ADMIN sees medical record section', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })
  })

  it('USER does not see medical record section', async () => {
    mockAuth(UserRole.USER)
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-summary')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })

  it('clicking complete button calls service', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.complete.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.COMPLETED }),
    )
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: DOCTOR_ID, date: '2025-06-10', slots: [] })
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => expect(screen.getByTestId('appointment-detail-complete-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-detail-complete-button'))
    await waitFor(() => {
      expect(mockAppointmentsService.complete).toHaveBeenCalledWith('appt-uuid')
    })
  })

  it('shows 422 error when complete fails', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.complete.mockRejectedValue({ status: 422 })
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: DOCTOR_ID, date: '2025-06-10', slots: [] })
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => expect(screen.getByTestId('appointment-detail-complete-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-detail-complete-button'))
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-complete-error')).toHaveTextContent(
        'Não é possível concluir uma consulta futura.',
      )
    })
  })

  it('clicking cancel button opens cancel dialog', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => expect(screen.getByTestId('appointment-detail-cancel-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-detail-cancel-button'))
    expect(screen.getByTestId('cancel-appointment-dialog')).toBeInTheDocument()
  })

  it('confirming cancel dialog calls cancel service', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto())
    mockAppointmentsService.cancel.mockResolvedValue(
      makeAppointmentDto({ status: AppointmentStatus.CANCELLED }),
    )
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({ doctorId: DOCTOR_ID, date: '2025-06-10', slots: [] })
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => expect(screen.getByTestId('appointment-detail-cancel-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('appointment-detail-cancel-button'))
    await userEvent.click(screen.getByTestId('cancel-dialog-confirm'))
    await waitFor(() => {
      expect(mockAppointmentsService.cancel).toHaveBeenCalledWith('appt-uuid', expect.any(Object))
    })
  })

  it('renders reason when present', async () => {
    mockAppointmentsService.getById.mockResolvedValue(makeAppointmentDto({ reason: 'Dor de cabeça' }))
    renderWithProviders(<AppointmentDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId('appointment-detail-reason')).toHaveTextContent('Dor de cabeça')
    })
  })
})
