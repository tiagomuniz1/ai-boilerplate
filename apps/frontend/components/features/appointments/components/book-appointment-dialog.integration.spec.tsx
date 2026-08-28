jest.mock('../services/appointments.service')
jest.mock('@/components/features/patients/services/patients.service')
jest.mock('@/components/features/professionals/services/professionals.service')
jest.mock('next/navigation', () => ({ useRouter: jest.fn(() => ({ push: jest.fn() })) }))

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AppointmentStatus,
  DayOfWeek,
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
  RecurrenceInterval,
  RecurringOccurrenceAvailability,
} from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { patientsService } from '@/components/features/patients/services/patients.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { BookAppointmentDialog } from './book-appointment-dialog'

const mockAppointmentsService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockPatientsService = patientsService as jest.Mocked<typeof patientsService>
const mockDoctorsService = professionalsService as jest.Mocked<typeof professionalsService>

const PATIENT_UUID = '00000000-0000-4000-e000-000000000001'
const SPEC_UUID_1 = '00000000-0000-4000-f000-000000000001'
const SPEC_UUID_2 = '00000000-0000-4000-f000-000000000002'

const makePatientsResponse = (patients: { id: string; fullName: string }[] = []) => ({
  data: patients.map((p) => ({
    id: p.id,
    user: { id: '00000000-0000-4000-f000-000000000001', fullName: p.fullName, email: `test@test.com`, isActive: true },
    fullName: p.fullName,
    phoneNumber: '11999999999',
    birthDate: '1990-01-01',
    documentNumber: '12345678901',
    gender: 'male',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  total: patients.length,
  page: 1,
  limit: 200,
})

const makeDoctorResponse = (specialties: { id: string; name: string }[]) => ({
  id: 'doctor-uuid',
  user: { id: 'user-uuid', fullName: 'Dr. Test', email: 'doc@test.com', isActive: true },
  registrations: [{ id: 'crm-1', councilType: 'crm', number: '12345', state: 'SP', isPrimary: true }],
  specialties: specialties.map((s) => ({ ...s, rqe: null })),
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const makeAppointmentResponse = () => ({
  id: 'appt-new-uuid',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  specialtyId: null,
  specialtyName: null,
  scheduleId: 'schedule-uuid',
  date: '2025-07-04',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: null,
  cancellationReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
})

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  date: '2025-07-04',
  startTime: '09:00',
  endTime: '09:30',
  professionalId: 'doctor-uuid',
}

describe('BookAppointmentDialog (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPatientsService.getAll.mockResolvedValue(
      makePatientsResponse([{ id: PATIENT_UUID, fullName: 'Patient One' }]),
    )
    mockDoctorsService.getById.mockResolvedValue(
      makeDoctorResponse([{ id: SPEC_UUID_1, name: 'Cardiologia' }]),
    )
  })

  it('renders dialog with date and time info', () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)
    expect(screen.getByTestId('book-appointment-dialog')).toBeInTheDocument()
    expect(screen.getByTestId('book-dialog-date')).toHaveTextContent('04/07/2025')
    expect(screen.getByTestId('book-dialog-time')).toHaveTextContent('09:00')
  })

  it('shows patient validation error when submitting without selecting patient', async () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-patient-error')).toBeInTheDocument()
    })
  })

  it('calls book and closes on success', async () => {
    mockAppointmentsService.book.mockResolvedValue(makeAppointmentResponse())
    mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
    mockAppointmentsService.getAvailability.mockResolvedValue({
      professionalId: 'doctor-uuid',
      date: '2025-07-04',
      slots: [],
    })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(mockAppointmentsService.book).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: PATIENT_UUID,
          date: '2025-07-04',
          startTime: '09:00',
        }),
      )
    })

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows 409 conflict error alert', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 409, title: 'Conflict', detail: 'Slot taken' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('acabou de ser reservado')
  })

  it('shows 422 invalid slot error alert', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 422, title: 'Unprocessable', detail: 'Horário inválido' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('inválido ou no passado')
  })

  it('does not render when isOpen is false', () => {
    renderWithProviders(<BookAppointmentDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByTestId('book-appointment-dialog')).not.toBeInTheDocument()
  })


  it('shows generic error alert when mutation fails with non-409/non-422 error', async () => {
    mockAppointmentsService.book.mockRejectedValue({ status: 500, title: 'Server Error', detail: 'Internal error' })

    renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
    })

    await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
    await userEvent.click(screen.getByTestId('book-dialog-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
    })

    expect(screen.getByTestId('book-dialog-error')).toHaveTextContent('Ocorreu um erro ao agendar')
  })

  describe('specialty selection', () => {
    it('shows read-only specialty and auto-selects when doctor has 1 specialty', async () => {
      mockDoctorsService.getById.mockResolvedValue(
        makeDoctorResponse([{ id: SPEC_UUID_1, name: 'Cardiologia' }]),
      )

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })

      expect(screen.getByTestId('book-dialog-specialty-readonly')).toHaveTextContent('Cardiologia')
      expect(screen.queryByTestId('book-dialog-specialty')).not.toBeInTheDocument()
    })

    it('sends specialtyId in payload when doctor has 1 specialty', async () => {
      mockDoctorsService.getById.mockResolvedValue(
        makeDoctorResponse([{ id: SPEC_UUID_1, name: 'Cardiologia' }]),
      )
      mockAppointmentsService.book.mockResolvedValue(makeAppointmentResponse())
      mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
      mockAppointmentsService.getAvailability.mockResolvedValue({
        professionalId: 'doctor-uuid',
        date: '2025-07-04',
        slots: [],
      })

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
      })

      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(mockAppointmentsService.book).toHaveBeenCalledWith(
          expect.objectContaining({ specialtyId: SPEC_UUID_1 }),
        )
      })
    })

    it('shows specialty select when doctor has 2+ specialties', async () => {
      mockDoctorsService.getById.mockResolvedValue(
        makeDoctorResponse([
          { id: SPEC_UUID_1, name: 'Cardiologia' },
          { id: SPEC_UUID_2, name: 'Clínica Geral' },
        ]),
      )

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty')).toBeInTheDocument()
      })

      expect(screen.getByRole('option', { name: 'Cardiologia' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Clínica Geral' })).toBeInTheDocument()
      expect(screen.queryByTestId('book-dialog-specialty-readonly')).not.toBeInTheDocument()
    })

    it('shows validation error when submitting without selecting specialty (2+ specialties)', async () => {
      mockDoctorsService.getById.mockResolvedValue(
        makeDoctorResponse([
          { id: SPEC_UUID_1, name: 'Cardiologia' },
          { id: SPEC_UUID_2, name: 'Clínica Geral' },
        ]),
      )

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty')).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
      })

      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-error')).toBeInTheDocument()
      })

      expect(screen.getByTestId('book-dialog-specialty-error')).toHaveTextContent('Selecione uma especialidade')
    })

    it('sends specialtyId when user selects from multi-specialty dropdown', async () => {
      mockDoctorsService.getById.mockResolvedValue(
        makeDoctorResponse([
          { id: SPEC_UUID_1, name: 'Cardiologia' },
          { id: SPEC_UUID_2, name: 'Clínica Geral' },
        ]),
      )
      mockAppointmentsService.book.mockResolvedValue(makeAppointmentResponse())
      mockAppointmentsService.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })
      mockAppointmentsService.getAvailability.mockResolvedValue({
        professionalId: 'doctor-uuid',
        date: '2025-07-04',
        slots: [],
      })

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty')).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
      })

      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.selectOptions(screen.getByTestId('book-dialog-specialty'), SPEC_UUID_2)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(mockAppointmentsService.book).toHaveBeenCalledWith(
          expect.objectContaining({ specialtyId: SPEC_UUID_2 }),
        )
      })
    })

    it('shows no specialty field and keeps submit enabled when the professional has 0 specialties', async () => {
      mockDoctorsService.getById.mockResolvedValue(makeDoctorResponse([]))

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-submit')).not.toBeDisabled()
      })

      expect(screen.queryByTestId('book-dialog-specialty-readonly')).not.toBeInTheDocument()
      expect(screen.queryByTestId('book-dialog-specialty')).not.toBeInTheDocument()
    })

    it('books a generalist appointment (no specialtyId) when doctor has 0 specialties', async () => {
      mockDoctorsService.getById.mockResolvedValue(makeDoctorResponse([]))

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
      })

      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(mockAppointmentsService.book).toHaveBeenCalled()
      })

      expect(mockAppointmentsService.book.mock.calls[0][0].specialtyId).toBeUndefined()
    })

    it('shows 422 specialty error alert when backend rejects specialty', async () => {
      mockAppointmentsService.book.mockRejectedValue({
        status: 422,
        title: 'Unprocessable',
        detail: 'Especialidade não pertence ao profissional',
      })

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument()
      })

      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-error')).toBeInTheDocument()
      })

      expect(screen.getByTestId('book-dialog-error')).toHaveTextContent(
        'Especialidade inválida ou não pertence ao profissional',
      )
    })
  })
  describe('recurring series', () => {
    // 2025-07-04 is a Friday; weekly repetitions land on 11/07 and 18/07.
    const makePreviewResponse = (overrides: object = {}) => ({
      professionalId: 'doctor-uuid',
      patientId: PATIENT_UUID,
      recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
      dayOfWeek: DayOfWeek.FRIDAY,
      startTime: '09:00',
      occurrences: [
        {
          date: '2025-07-04',
          startTime: '09:00',
          endTime: '09:30',
          scheduleId: 'schedule-uuid',
          availability: RecurringOccurrenceAvailability.AVAILABLE,
          selectable: true,
        },
        {
          date: '2025-07-11',
          startTime: '09:00',
          endTime: null,
          scheduleId: null,
          availability: RecurringOccurrenceAvailability.ALREADY_BOOKED,
          selectable: false,
        },
        {
          date: '2025-07-18',
          startTime: '09:00',
          endTime: '09:30',
          scheduleId: 'schedule-uuid',
          availability: RecurringOccurrenceAvailability.AVAILABLE,
          selectable: true,
        },
      ],
      availableOccurrenceCount: 2,
      unavailableOccurrenceCount: 1,
      truncatedByMaximumOccurrences: false,
      truncatedByHorizon: false,
      ...overrides,
    })

    async function fillFormAndGoToPreview() {
      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))
      await userEvent.click(screen.getByTestId('book-dialog-submit'))
    }

    it('keeps the recurrence fields hidden until the toggle is switched on', async () => {
      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      expect(screen.queryByTestId('book-dialog-recurrence-fields')).not.toBeInTheDocument()
      expect(screen.getByTestId('book-dialog-submit')).toHaveTextContent('Agendar')

      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))

      expect(screen.getByTestId('book-dialog-recurrence-fields')).toBeInTheDocument()
      expect(screen.getByTestId('book-dialog-recurrence-summary')).toHaveTextContent(
        'Toda sexta-feira às 09:00',
      )
      expect(screen.getByTestId('book-dialog-submit')).toHaveTextContent('Revisar datas')
    })

    it('constrains the occurrence count natively to the allowed range', async () => {
      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))

      const input = screen.getByTestId('book-dialog-recurrence-occurrences')
      expect(input).toHaveAttribute('min', String(MINIMUM_RECURRING_OCCURRENCES))
      expect(input).toHaveAttribute('max', String(MAXIMUM_RECURRING_OCCURRENCES))
    })

    it('rejects an empty occurrence count', async () => {
      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))
      await userEvent.clear(screen.getByTestId('book-dialog-recurrence-occurrences'))
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-recurrence-occurrences-error')).toBeInTheDocument()
      })
      expect(mockAppointmentsService.previewRecurrence).not.toHaveBeenCalled()
    })

    it('requires an end date when that mode is chosen', async () => {
      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-end-date'))
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-recurrence-until-error')).toBeInTheDocument()
      })
    })

    it('shows the loading state and then the preview list', async () => {
      let resolvePreview: (value: unknown) => void = () => {}
      mockAppointmentsService.previewRecurrence.mockReturnValue(
        new Promise((resolve) => {
          resolvePreview = resolve
        }) as never,
      )

      await fillFormAndGoToPreview()

      expect(screen.getByTestId('recurrence-preview-loading')).toBeInTheDocument()

      resolvePreview(makePreviewResponse())

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
    })

    it('renders each occurrence status and disables the ones that cannot be booked', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)

      await fillFormAndGoToPreview()

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      expect(screen.getByTestId('recurrence-preview-status-2025-07-04')).toHaveTextContent('Disponível')
      expect(screen.getByTestId('recurrence-preview-status-2025-07-11')).toHaveTextContent('Ocupado')
      expect(screen.getByTestId('recurrence-preview-checkbox-2025-07-11')).toBeDisabled()
      expect(screen.getByTestId('recurrence-preview-checkbox-2025-07-11')).not.toBeChecked()
      expect(screen.getByTestId('recurrence-preview-checkbox-2025-07-04')).toBeChecked()
      expect(screen.getByTestId('recurrence-preview-selected-count')).toHaveTextContent(
        '2 datas selecionadas',
      )
    })

    it('lets the user untick a date and updates the counter and the button', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('recurrence-preview-checkbox-2025-07-18'))

      expect(screen.getByTestId('recurrence-preview-selected-count')).toHaveTextContent(
        '1 datas selecionadas',
      )
      expect(screen.getByTestId('book-dialog-recurrence-confirm')).toHaveTextContent(
        'Agendar 1 consultas',
      )
    })

    it('re-ticks a date the user had unticked', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('recurrence-preview-checkbox-2025-07-18'))
      expect(screen.getByTestId('recurrence-preview-checkbox-2025-07-18')).not.toBeChecked()

      await userEvent.click(screen.getByTestId('recurrence-preview-checkbox-2025-07-18'))

      expect(screen.getByTestId('recurrence-preview-checkbox-2025-07-18')).toBeChecked()
      expect(screen.getByTestId('recurrence-preview-selected-count')).toHaveTextContent(
        '2 datas selecionadas',
      )
    })

    it('omits the specialty for a generalist professional', async () => {
      mockDoctorsService.getById.mockResolvedValue(makeDoctorResponse([]))
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockResolvedValue({
        seriesId: 'series-uuid',
        recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '09:00',
        createdOccurrenceCount: 2,
        appointments: [],
      } as never)

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      // A generalist renders no specialty block, so wait on the patient option instead.
      await waitFor(() => expect(screen.getByRole('option', { name: 'Patient One' })).toBeInTheDocument())
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() => expect(mockAppointmentsService.bookRecurring).toHaveBeenCalled())
      const [payload] = mockAppointmentsService.bookRecurring.mock.calls[0]
      expect(payload.specialtyId).toBeUndefined()
    })

    it('unticks and re-ticks every selectable date with the toggle-all button', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('recurrence-preview-toggle-all'))
      expect(screen.getByTestId('book-dialog-recurrence-confirm')).toBeDisabled()

      await userEvent.click(screen.getByTestId('recurrence-preview-toggle-all'))
      expect(screen.getByTestId('recurrence-preview-selected-count')).toHaveTextContent(
        '2 datas selecionadas',
      )
    })

    it('shows the empty state when no date is generated', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(
        makePreviewResponse({ occurrences: [], availableOccurrenceCount: 0 }) as never,
      )

      await fillFormAndGoToPreview()

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-empty')).toBeInTheDocument())
      expect(screen.queryByTestId('book-dialog-recurrence-confirm')).not.toBeInTheDocument()
    })

    it('shows the preview error and recovers on retry', async () => {
      mockAppointmentsService.previewRecurrence.mockRejectedValueOnce(new Error('Network error'))

      await fillFormAndGoToPreview()

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-error')).toBeInTheDocument())

      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      await userEvent.click(screen.getByTestId('recurrence-preview-retry'))

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
    })

    it('submits exactly the ticked dates and closes on success', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockResolvedValue({
        seriesId: 'series-uuid',
        recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '09:00',
        createdOccurrenceCount: 2,
        appointments: [],
      } as never)

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() => expect(mockAppointmentsService.bookRecurring).toHaveBeenCalled())
      const [payload] = mockAppointmentsService.bookRecurring.mock.calls[0]
      expect(payload.dates).toEqual(['2025-07-04', '2025-07-18'])
      expect(payload.recurrenceInterval).toBe(RecurrenceInterval.EVERY_WEEK)
      expect(payload.occurrenceCount).toBe(4)
      expect(payload.patientId).toBe(PATIENT_UUID)
      await waitFor(() => expect(defaultProps.onClose).toHaveBeenCalled())
    })

    it('stays on the preview listing the dates that stopped being available', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockRejectedValue({
        status: 409,
        conflictingOccurrences: [{ date: '2025-07-18' }],
      })

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() => expect(screen.getByTestId('recurrence-submit-error')).toBeInTheDocument())
      expect(screen.getByTestId('recurrence-submit-error')).toHaveTextContent('18/07/2025')
      expect(screen.getByTestId('book-dialog-recurrence-step')).toBeInTheDocument()
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('falls back to a generic message when the 409 carries no conflicting dates', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockRejectedValue({ status: 409 })

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() =>
        expect(screen.getByTestId('recurrence-submit-error')).toHaveTextContent(
          'Algumas datas deixaram de estar disponíveis',
        ),
      )
    })

    it('reports an invalid recurrence configuration rejected by the server', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockRejectedValue({ status: 422 })

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() =>
        expect(screen.getByTestId('recurrence-submit-error')).toHaveTextContent(
          'A configuração de recorrência é inválida',
        ),
      )
    })

    it('reports a generic failure for any other error', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockRejectedValue({ status: 500 })

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() =>
        expect(screen.getByTestId('recurrence-submit-error')).toHaveTextContent(
          'Ocorreu um erro ao agendar a série',
        ),
      )
    })

    it('previews and books a series bounded by an end date', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)
      mockAppointmentsService.bookRecurring.mockResolvedValue({
        seriesId: 'series-uuid',
        recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '09:00',
        createdOccurrenceCount: 2,
        appointments: [],
      } as never)

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-toggle'))
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-end-date'))
      fireEvent.change(screen.getByTestId('book-dialog-recurrence-until'), {
        target: { value: '2025-07-18' },
      })
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => expect(mockAppointmentsService.previewRecurrence).toHaveBeenCalled())
      const [previewParams] = mockAppointmentsService.previewRecurrence.mock.calls[0]
      expect(previewParams.untilDate).toBe('2025-07-18')
      expect(previewParams.occurrenceCount).toBeUndefined()

      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('book-dialog-recurrence-confirm'))

      await waitFor(() => expect(mockAppointmentsService.bookRecurring).toHaveBeenCalled())
      const [payload] = mockAppointmentsService.bookRecurring.mock.calls[0]
      expect(payload.untilDate).toBe('2025-07-18')
      expect(payload.occurrenceCount).toBeUndefined()
    })

    it('goes back to the form keeping the values that were filled in', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(makePreviewResponse() as never)

      await fillFormAndGoToPreview()
      await waitFor(() => expect(screen.getByTestId('recurrence-preview-list')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('book-dialog-recurrence-back'))

      expect(screen.getByTestId('book-dialog-patient')).toHaveValue(PATIENT_UUID)
      expect(screen.getByTestId('book-dialog-recurrence-fields')).toBeInTheDocument()
    })

    it('warns when the series was capped by the maximum number of occurrences', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(
        makePreviewResponse({ truncatedByMaximumOccurrences: true }) as never,
      )

      await fillFormAndGoToPreview()

      await waitFor(() =>
        expect(screen.getByTestId('recurrence-preview-truncated')).toBeInTheDocument(),
      )
    })

    it('warns when the series was capped by the one-year horizon', async () => {
      mockAppointmentsService.previewRecurrence.mockResolvedValue(
        makePreviewResponse({ truncatedByHorizon: true }) as never,
      )

      await fillFormAndGoToPreview()

      await waitFor(() =>
        expect(screen.getByTestId('recurrence-preview-truncated-horizon')).toBeInTheDocument(),
      )
    })

    it('books a single appointment when the toggle is left off', async () => {
      mockAppointmentsService.book.mockResolvedValue(makeAppointmentResponse() as never)

      renderWithProviders(<BookAppointmentDialog {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('book-dialog-specialty-readonly')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('book-dialog-patient'), PATIENT_UUID)
      await userEvent.click(screen.getByTestId('book-dialog-submit'))

      await waitFor(() => expect(mockAppointmentsService.book).toHaveBeenCalled())
      expect(mockAppointmentsService.previewRecurrence).not.toHaveBeenCalled()
      expect(mockAppointmentsService.bookRecurring).not.toHaveBeenCalled()
    })
  })
})
