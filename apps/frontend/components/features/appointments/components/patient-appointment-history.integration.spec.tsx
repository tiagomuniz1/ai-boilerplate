jest.mock('../services/appointments.service')
jest.mock('@/components/features/professionals/services/professionals.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, CouncilType, UserRole } from '@app/shared'
import { appointmentsService } from '../services/appointments.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientAppointmentHistory } from './patient-appointment-history'

const mockService = appointmentsService as jest.Mocked<typeof appointmentsService>
const mockProfessionalsService = professionalsService as jest.Mocked<typeof professionalsService>

const PATIENT_ID = 'patient-uuid'

const makeUser = (role: UserRole) => ({
  id: 'user-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  clinicId: 'clinic-uuid',
})

const makeAppointmentDto = (overrides: object = {}) => ({
  id: 'appointment-uuid',
  professionalId: 'professional-uuid',
  professionalName: 'Dra. Helena Vasconcelos',
  patientId: PATIENT_ID,
  patientName: 'Clara Monteiro Alves',
  specialtyId: 'specialty-uuid',
  specialtyName: 'Ginecologia e Obstetrícia',
  scheduleId: 'schedule-uuid',
  date: '2026-09-03',
  startTime: '09:00',
  endTime: '09:30',
  status: AppointmentStatus.SCHEDULED,
  reason: 'Consulta de rotina',
  cancellationReason: null,
  seriesId: null,
  seriesSequence: null,
  seriesTotalOccurrences: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const makePage = (items: object[], total = items.length) => ({
  data: items,
  total,
  page: 1,
  limit: 20,
})

const makeProfessionalDto = (id: string, fullName: string) => ({
  id,
  user: { id: `${id}-user`, fullName, email: `${id}@example.com`, isActive: true },
  registrations: [{ id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

describe('PatientAppointmentHistory (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockProfessionalsService.getAll.mockResolvedValue({
      data: [
        makeProfessionalDto('professional-uuid', 'Dra. Helena Vasconcelos'),
        makeProfessionalDto('other-uuid', 'Dr. Rafael Andrade'),
      ],
      total: 2,
      page: 1,
      limit: 100,
    } as any)
  })

  it('renders a skeleton while loading', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)
    expect(screen.getByTestId('patient-appointment-history-skeleton')).toBeInTheDocument()
  })

  it('renders an error state when the fetch fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)
    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-history-error')).toBeInTheDocument()
    })
  })

  it('renders an empty state when the patient has no appointments', async () => {
    mockService.getAll.mockResolvedValue(makePage([]) as any)
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)
    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-history-empty')).toHaveTextContent(
        'Este paciente ainda não tem consultas',
      )
    })
  })

  it('always scopes the query to this patient', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

    await waitFor(() => {
      expect(mockService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: PATIENT_ID }),
      )
    })
  })

  it('renders date, time, professional, specialty and status', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-history-table')).toBeInTheDocument()
    })

    const row = screen.getByTestId('patient-appointment-row-appointment-uuid')
    expect(within(row).getByTestId('patient-appointment-date-appointment-uuid')).toHaveTextContent('03/09/2026')
    expect(row).toHaveTextContent('09:00')
    expect(row).toHaveTextContent('Dra. Helena Vasconcelos')
    expect(row).toHaveTextContent('Ginecologia e Obstetrícia')
    expect(within(row).getByTestId('patient-appointment-status-scheduled')).toHaveTextContent('Agendada')
  })

  // O backend devolve `date` DESC (appointments.repository.ts:36). A tela não
  // reordena — este teste trava a ordem recebida, para uma ordenação local
  // acidental não inverter o "mais recente no topo".
  it('keeps the order returned by the API, most recent first', async () => {
    mockService.getAll.mockResolvedValue(
      makePage([
        makeAppointmentDto({ id: 'recente', date: '2026-09-03' }),
        makeAppointmentDto({ id: 'antiga', date: '2025-02-11' }),
      ]) as any,
    )
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-row-recente')).toBeInTheDocument()
    })

    const linhas = screen.getAllByTestId(/^patient-appointment-row-/)
    expect(linhas[0]).toHaveAttribute('data-testid', 'patient-appointment-row-recente')
    expect(linhas[1]).toHaveAttribute('data-testid', 'patient-appointment-row-antiga')
  })

  it('links each appointment to its own screen', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-link-appointment-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('patient-appointment-link-appointment-uuid')).toHaveAttribute(
      'href',
      expect.stringContaining('/appointments/appointment-uuid'),
    )
  })

  describe('filtro por profissional', () => {
    it('offers the filter to an ADMIN and narrows the query', async () => {
      mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      const filtro = await screen.findByTestId('patient-appointment-history-professional-filter')
      await waitFor(() => {
        expect(within(filtro).getByText('Dr. Rafael Andrade')).toBeInTheDocument()
      })

      await userEvent.selectOptions(filtro, 'other-uuid')

      await waitFor(() => {
        expect(mockService.getAll).toHaveBeenLastCalledWith(
          expect.objectContaining({ patientId: PATIENT_ID, professionalId: 'other-uuid' }),
        )
      })
    })

    it('offers the filter to a receptionist', async () => {
      useAuthStore.setState({ user: makeUser(UserRole.USER) })
      mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-professional-filter')).toBeInTheDocument()
      })
    })

    // O recorte do profissional é do backend (list-appointments.use-case.ts:29):
    // oferecer o seletor a ele sugeriria um alcance que ele não tem.
    it('hides the filter from a professional, who only ever gets their own', async () => {
      useAuthStore.setState({ user: makeUser(UserRole.PROFESSIONAL) })
      mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-table')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('patient-appointment-history-professional-filter')).not.toBeInTheDocument()
      expect(mockProfessionalsService.getAll).not.toHaveBeenCalled()
    })

    it('shows a filter-aware empty state', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      const filtro = await screen.findByTestId('patient-appointment-history-professional-filter')
      await waitFor(() => {
        expect(within(filtro).getByText('Dr. Rafael Andrade')).toBeInTheDocument()
      })
      await userEvent.selectOptions(filtro, 'other-uuid')

      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-empty')).toHaveTextContent(
          'com o profissional selecionado',
        )
      })
    })
  })

  describe('paginação', () => {
    it('walks to the next page and back', async () => {
      mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()], 45) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-page-info')).toHaveTextContent('Página 1 de 3')
      })
      expect(screen.getByTestId('patient-appointment-history-prev-page')).toBeDisabled()

      await userEvent.click(screen.getByTestId('patient-appointment-history-next-page'))

      await waitFor(() => {
        expect(mockService.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }))
      })
      expect(screen.getByTestId('patient-appointment-history-page-info')).toHaveTextContent('Página 2 de 3')
    })

    it('returns to the first page when the professional filter changes', async () => {
      mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()], 45) as any)
      renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-next-page')).toBeInTheDocument()
      })
      await userEvent.click(screen.getByTestId('patient-appointment-history-next-page'))
      await waitFor(() => {
        expect(screen.getByTestId('patient-appointment-history-page-info')).toHaveTextContent('Página 2 de 3')
      })

      await userEvent.selectOptions(
        screen.getByTestId('patient-appointment-history-professional-filter'),
        'other-uuid',
      )

      await waitFor(() => {
        expect(mockService.getAll).toHaveBeenLastCalledWith(
          expect.objectContaining({ professionalId: 'other-uuid', page: 1 }),
        )
      })
    })
  })

  it('renders a mobile card per appointment', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeAppointmentDto()]) as any)
    renderWithProviders(<PatientAppointmentHistory patientId={PATIENT_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointment-card-appointment-uuid')).toBeInTheDocument()
    })
    const card = screen.getByTestId('patient-appointment-card-appointment-uuid')
    expect(card).toHaveTextContent('03/09/2026')
    expect(card).toHaveTextContent('Dra. Helena Vasconcelos')
    expect(card).toHaveTextContent('Agendada')
  })
})
