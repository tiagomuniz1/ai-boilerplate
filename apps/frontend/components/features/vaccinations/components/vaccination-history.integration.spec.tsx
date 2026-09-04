jest.mock('../services/vaccinations.service')
jest.mock('@/components/features/vaccines/services/vaccines.service')
jest.mock('@/components/features/professionals/services/professionals.service')

import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CouncilType, UserRole } from '@app/shared'
import { vaccinationsService } from '../services/vaccinations.service'
import { vaccinesService } from '@/components/features/vaccines/services/vaccines.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { VaccinationHistory } from './vaccination-history'

const mockService = vaccinationsService as jest.Mocked<typeof vaccinationsService>
const mockVaccinesService = vaccinesService as jest.Mocked<typeof vaccinesService>
const mockProfessionalsService = professionalsService as jest.Mocked<typeof professionalsService>

const PATIENT = 'patient-uuid'
const MY_PROFESSIONAL = 'prof-mine'

const makeUser = (role: UserRole) => ({
  id: 'user-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  clinicId: 'clinic-uuid',
})

const makeMyProfessional = (id = MY_PROFESSIONAL) => ({
  id,
  user: { id: 'user-uuid', fullName: 'Dra. Helena', email: 'helena@example.com', isActive: true },
  registrations: [{ id: 'r1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const makeVaccinationDto = (overrides: object = {}) => ({
  id: 'vc-1',
  patientId: PATIENT,
  vaccineId: 'v-1',
  vaccineName: 'Tríplice viral',
  vaccineAbbreviation: 'SCR',
  appointmentId: null,
  recordedByProfessionalId: MY_PROFESSIONAL,
  recordedByProfessionalName: 'Dra. Helena',
  doseLabel: '1ª dose',
  appliedAt: '2019-04-12',
  appliedAtOurClinic: false,
  appliedAtDescription: 'UBS Centro',
  lotNumber: null,
  manufacturer: null,
  notes: null,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const makePage = (items: object[], total = items.length) => ({ data: items, total, page: 1, limit: 20 })

describe('VaccinationHistory (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: makeUser(UserRole.PROFESSIONAL) })
    mockProfessionalsService.getMine.mockResolvedValue(makeMyProfessional() as never)
    mockVaccinesService.getAll.mockResolvedValue(
      makePage([{ id: 'v-1', name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: null, isActive: true, createdAt: new Date().toISOString() }]) as never,
    )
  })

  it('renders a skeleton while loading', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}) as never)
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)
    expect(screen.getByTestId('vaccination-history-skeleton')).toBeInTheDocument()
  })

  it('renders an error state when the fetch fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccination-history-error')).toBeInTheDocument()
    })
  })

  it('renders an empty state for a patient with no doses', async () => {
    mockService.getAll.mockResolvedValue(makePage([]) as never)
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccination-history-empty')).toBeInTheDocument()
    })
  })

  it('renders vaccine, dose, date, origin and who recorded it', async () => {
    mockService.getAll.mockResolvedValue(makePage([makeVaccinationDto()]) as never)
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccination-history-table')).toBeInTheDocument()
    })

    const row = screen.getByTestId('vaccination-row-vc-1')
    expect(row).toHaveTextContent('Tríplice viral')
    expect(row).toHaveTextContent('1ª dose')
    expect(row).toHaveTextContent('12/04/2019')
    expect(row).toHaveTextContent('UBS Centro')
    expect(row).toHaveTextContent('Dra. Helena')
  })

  // A data é civil, sem hora: converter para Date faria 12/04 virar 11/04 à
  // noite em UTC-3.
  it('shows the applied date without shifting it by timezone', async () => {
    mockService.getAll.mockResolvedValue(
      makePage([makeVaccinationDto({ appliedAt: '2024-01-01' })]) as never,
    )
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccination-row-vc-1')).toHaveTextContent('01/01/2024')
    })
  })

  it('labels a dose applied here as being from this clinic', async () => {
    mockService.getAll.mockResolvedValue(
      makePage([makeVaccinationDto({ appliedAtOurClinic: true, appliedAtDescription: null })]) as never,
    )
    renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccination-row-vc-1')).toHaveTextContent('Nesta clínica')
    })
  })

  describe('quem pode registrar', () => {
    // Exercer vem da ficha, não do cargo.
    it('offers the button to a user who holds a professional profile', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as never)
      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-history-new-button')).toBeInTheDocument()
      })
    })

    // A médica que administra a própria clínica: cargo ADMIN e ficha. É o caso
    // que um gate por cargo quebraria sem ninguém notar.
    it('offers the button to an ADMIN who also practises', async () => {
      useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
      mockService.getAll.mockResolvedValue(makePage([]) as never)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-history-new-button')).toBeInTheDocument()
      })
    })

    it('hides the button from an ADMIN with no professional profile', async () => {
      useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
      mockProfessionalsService.getMine.mockResolvedValue(null as never)
      mockService.getAll.mockResolvedValue(makePage([]) as never)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-history-empty')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('vaccination-history-new-button')).not.toBeInTheDocument()
    })
  })

  describe('quem pode excluir', () => {
    // Corrigir a caderneta é zeladoria da clínica, não exercício.
    it('lets an ADMIN with no profile delete any dose', async () => {
      useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
      mockProfessionalsService.getMine.mockResolvedValue(null as never)
      mockService.getAll.mockResolvedValue(
        makePage([makeVaccinationDto({ recordedByProfessionalId: 'outro-prof' })]) as never,
      )

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-delete-vc-1')).toBeInTheDocument()
      })
    })

    it('hides delete from a professional on a dose someone else recorded', async () => {
      mockService.getAll.mockResolvedValue(
        makePage([makeVaccinationDto({ recordedByProfessionalId: 'outro-prof' })]) as never,
      )

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-row-vc-1')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('vaccination-delete-vc-1')).not.toBeInTheDocument()
    })

    it('shows delete to the professional who recorded it', async () => {
      mockService.getAll.mockResolvedValue(makePage([makeVaccinationDto()]) as never)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-delete-vc-1')).toBeInTheDocument()
      })
    })
  })

  describe('registrar uma dose', () => {
    it('sends the patient and, when given, the appointment', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as never)
      mockService.create.mockResolvedValue(makeVaccinationDto() as never)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} appointmentId="appt-1" />)

      await userEvent.click(await screen.findByTestId('vaccination-history-new-button'))
      const form = await screen.findByTestId('vaccination-form')

      await waitFor(() => {
        expect(within(form).getByText('SCR — Tríplice viral')).toBeInTheDocument()
      })
      await userEvent.selectOptions(screen.getByTestId('vaccination-form-vaccine'), 'v-1')
      await userEvent.type(screen.getByTestId('vaccination-form-dose'), '1ª dose')
      fireEvent.change(screen.getByTestId('vaccination-form-applied-at'), { target: { value: '2019-04-12' } })
      await userEvent.click(screen.getByTestId('vaccination-form-submit'))

      await waitFor(() => {
        expect(mockService.create).toHaveBeenCalledWith(
          expect.objectContaining({ patientId: PATIENT, appointmentId: 'appt-1', vaccineId: 'v-1' }),
        )
      })
    })

    // A caderneta registra o que já foi aplicado; dose planejada é outra coisa.
    // O campo de data carrega `max` no dia de hoje, e é a validação nativa do
    // navegador que barra a data futura — o submit sequer chega ao React. O
    // `refine` do zod fica como segunda barreira, e o backend devolve 422 como
    // terceira (coberto na integração).
    it('caps the date field at today so a future dose never reaches the API', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as never)
      const hoje = new Date().toISOString().slice(0, 10)
      const futuro = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccination-history-new-button'))
      await screen.findByTestId('vaccination-form')

      expect(screen.getByTestId('vaccination-form-applied-at')).toHaveAttribute('max', hoje)

      await userEvent.selectOptions(screen.getByTestId('vaccination-form-vaccine'), 'v-1')
      fireEvent.change(screen.getByTestId('vaccination-form-dose'), { target: { value: '1a dose' } })
      fireEvent.change(screen.getByTestId('vaccination-form-applied-at'), { target: { value: futuro } })
      await userEvent.click(screen.getByTestId('vaccination-form-submit'))

      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(mockService.create).not.toHaveBeenCalled()
    })

    it('shows a validation message for each required field left empty', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as never)

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccination-history-new-button'))
      await screen.findByTestId('vaccination-form')
      await userEvent.click(screen.getByTestId('vaccination-form-submit'))

      expect(await screen.findByText('Informe a dose')).toBeInTheDocument()
      expect(screen.getByText('Informe a data')).toBeInTheDocument()
      expect(screen.getByTestId('vaccination-form-vaccine-error')).toHaveTextContent('Escolha a vacina')
      expect(mockService.create).not.toHaveBeenCalled()
    })

    it('shows the API message when recording fails', async () => {
      mockService.getAll.mockResolvedValue(makePage([]) as never)
      mockService.create.mockRejectedValue({ detail: 'Vaccine not found' })

      renderWithProviders(<VaccinationHistory patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccination-history-new-button'))
      await screen.findByTestId('vaccination-form')
      await userEvent.selectOptions(screen.getByTestId('vaccination-form-vaccine'), 'v-1')
      await userEvent.type(screen.getByTestId('vaccination-form-dose'), '1ª dose')
      fireEvent.change(screen.getByTestId('vaccination-form-applied-at'), { target: { value: '2019-04-12' } })
      await userEvent.click(screen.getByTestId('vaccination-form-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('vaccination-form-error')).toHaveTextContent('Vaccine not found')
      })
    })
  })
})
