jest.mock('../services/vaccine-schedules.service')
jest.mock('@/components/features/professionals/services/professionals.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CouncilType, VaccineDecision, VaccineScheduleStatus } from '@app/shared'
import { vaccineSchedulesService } from '../services/vaccine-schedules.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { VaccineStatusPanel } from './vaccine-status-panel'

const mockService = vaccineSchedulesService as jest.Mocked<typeof vaccineSchedulesService>
const mockProfessionalsService = professionalsService as jest.Mocked<typeof professionalsService>

const PATIENT = 'patient-uuid'

const myProfessional = {
  id: 'prof-1',
  user: { id: 'u1', fullName: 'Dra. Helena', email: 'h@e.com', isActive: true },
  registrations: [{ id: 'r1', councilType: CouncilType.CRM, number: '1', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const makeItem = (overrides: object = {}) => ({
  vaccineId: 'v-1',
  vaccineName: 'Tríplice viral',
  vaccineAbbreviation: 'SCR',
  status: VaccineScheduleStatus.PENDENTE,
  nextDoseLabel: '1ª dose',
  nextDoseDueFrom: '2026-01-15',
  dosesTaken: 0,
  dosesExpected: 2,
  decision: null,
  decisionReason: null,
  decidedByProfessionalName: null,
  ...overrides,
})

const makeStatus = (items: object[], ageInMonths = 24) => ({ patientId: PATIENT, ageInMonths, items })

describe('VaccineStatusPanel (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProfessionalsService.getMine.mockResolvedValue(myProfessional as never)
  })

  it('renders a skeleton while loading', () => {
    mockService.getPatientStatus.mockReturnValue(new Promise(() => {}) as never)
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)
    expect(screen.getByTestId('vaccine-status-skeleton')).toBeInTheDocument()
  })

  it('renders an error state when the calculation fails', async () => {
    mockService.getPatientStatus.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-error')).toBeInTheDocument()
    })
  })

  it('renders an empty state when no rule applies', async () => {
    mockService.getPatientStatus.mockResolvedValue(makeStatus([]) as never)
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-empty')).toBeInTheDocument()
    })
  })

  // O sistema informa, não prescreve — e isso precisa estar na tela.
  it('always states that the conduct is the professional decision', async () => {
    mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-disclaimer')).toHaveTextContent(
        'A conduta é do profissional',
      )
    })
  })

  // "Pendente pelo calendário", não "em atraso": a diferença de linguagem é a
  // decisão de produto sobre responsabilidade.
  it('phrases the pending status as coming from the calendar', async () => {
    mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-badge-v-1')).toHaveTextContent(
        'Pendente pelo calendário',
      )
    })
  })

  it('shows the next dose and the date it becomes due', async () => {
    mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-item-v-1')).toHaveTextContent(
        '0 de 2 dose(s) · próxima: 1ª dose a partir de 15/01/2026',
      )
    })
  })

  it('summarises how many are pending', async () => {
    mockService.getPatientStatus.mockResolvedValue(
      makeStatus([
        makeItem(),
        makeItem({ vaccineId: 'v-2', vaccineName: 'BCG', status: VaccineScheduleStatus.ATRASADA }),
        makeItem({ vaccineId: 'v-3', vaccineName: 'Hepatite B', status: VaccineScheduleStatus.EM_DIA }),
      ]) as never,
    )
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-summary')).toHaveTextContent(
        '2 vacinas pendentes pelo calendário',
      )
    })
  })

  // A ordem responde "o que preciso olhar agora".
  it('puts what is out of window first and what is done last', async () => {
    mockService.getPatientStatus.mockResolvedValue(
      makeStatus([
        makeItem({ vaccineId: 'v-ok', status: VaccineScheduleStatus.EM_DIA }),
        makeItem({ vaccineId: 'v-atrasada', status: VaccineScheduleStatus.ATRASADA }),
        makeItem({ vaccineId: 'v-pendente', status: VaccineScheduleStatus.PENDENTE }),
      ]) as never,
    )
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-status-list')).toBeInTheDocument()
    })

    const ids = screen.getAllByTestId(/^vaccine-status-item-/).map((el) => el.getAttribute('data-testid'))
    expect(ids[0]).toBe('vaccine-status-item-v-atrasada')
    expect(ids[1]).toBe('vaccine-status-item-v-pendente')
    expect(ids[2]).toBe('vaccine-status-item-v-ok')
  })

  it('shows the recorded decision and who made it', async () => {
    mockService.getPatientStatus.mockResolvedValue(
      makeStatus([
        makeItem({
          status: VaccineScheduleStatus.NAO_SE_APLICA,
          decision: VaccineDecision.DISPENSADA,
          decisionReason: 'Contraindicação',
          decidedByProfessionalName: 'Dra. Helena',
        }),
      ]) as never,
    )
    renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-decision-reason-v-1')).toHaveTextContent(
        'Dra. Helena: Contraindicação',
      )
    })
  })

  describe('registrar conduta', () => {
    // Decidir sobre esquema vacinal é ato clínico: depende da ficha.
    it('hides the action from someone with no professional profile', async () => {
      mockProfessionalsService.getMine.mockResolvedValue(null as never)
      mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)

      renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccine-status-item-v-1')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('vaccine-decide-v-1')).not.toBeInTheDocument()
    })

    // Não há o que decidir sobre o que já está em dia.
    it('does not offer the action on a vaccine already up to date', async () => {
      mockService.getPatientStatus.mockResolvedValue(
        makeStatus([makeItem({ status: VaccineScheduleStatus.EM_DIA })]) as never,
      )

      renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

      await waitFor(() => {
        expect(screen.getByTestId('vaccine-status-item-v-1')).toBeInTheDocument()
      })
      expect(screen.queryByTestId('vaccine-decide-v-1')).not.toBeInTheDocument()
    })

    // Sem motivo, ninguém depois sabe por que a pendência sumiu da tela.
    it('refuses to waive without a reason, before reaching the API', async () => {
      mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)

      renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccine-decide-v-1'))
      await userEvent.selectOptions(screen.getByTestId('vaccine-decision-select'), VaccineDecision.DISPENSADA)
      await userEvent.click(screen.getByTestId('vaccine-decision-confirm'))

      expect(await screen.findByTestId('vaccine-decision-error')).toHaveTextContent('Informe o motivo')
      expect(mockService.recordDecision).not.toHaveBeenCalled()
    })

    it('records the decision with its reason', async () => {
      mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)
      mockService.recordDecision.mockResolvedValue(undefined as never)

      renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccine-decide-v-1'))
      await userEvent.selectOptions(screen.getByTestId('vaccine-decision-select'), VaccineDecision.ADIADA)
      await userEvent.type(screen.getByTestId('vaccine-decision-reason'), 'Quadro febril hoje')
      await userEvent.click(screen.getByTestId('vaccine-decision-confirm'))

      await waitFor(() => {
        expect(mockService.recordDecision).toHaveBeenCalledWith({
          patientId: PATIENT,
          vaccineId: 'v-1',
          decision: VaccineDecision.ADIADA,
          reason: 'Quadro febril hoje',
        })
      })
    })

    // Confirmar é só reconhecer o que o calendário disse.
    it('allows confirming with no reason', async () => {
      mockService.getPatientStatus.mockResolvedValue(makeStatus([makeItem()]) as never)
      mockService.recordDecision.mockResolvedValue(undefined as never)

      renderWithProviders(<VaccineStatusPanel patientId={PATIENT} />)

      await userEvent.click(await screen.findByTestId('vaccine-decide-v-1'))
      await userEvent.selectOptions(screen.getByTestId('vaccine-decision-select'), VaccineDecision.CONFIRMADA)
      await userEvent.click(screen.getByTestId('vaccine-decision-confirm'))

      await waitFor(() => {
        expect(mockService.recordDecision).toHaveBeenCalledWith(
          expect.objectContaining({ decision: VaccineDecision.CONFIRMADA, reason: undefined }),
        )
      })
    })
  })
})
