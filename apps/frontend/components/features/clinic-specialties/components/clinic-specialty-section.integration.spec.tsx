jest.mock('../services/clinic-specialties.service')
jest.mock('@/components/features/specialties/services/specialties.service')
jest.mock('../use-cases/link-specialty.use-case')
jest.mock('../use-cases/unlink-specialty.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { clinicSpecialtiesService } from '../services/clinic-specialties.service'
import { specialtiesService } from '@/components/features/specialties/services/specialties.service'
import { linkSpecialtyUseCase } from '../use-cases/link-specialty.use-case'
import { unlinkSpecialtyUseCase } from '../use-cases/unlink-specialty.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicSpecialtySection } from './clinic-specialty-section'

const CLINIC_ID = 'clinic-uuid-1'

const makeLinkedDto = (overrides = {}) => ({
  id: 'link-uuid-1',
  clinicId: CLINIC_ID,
  specialtyId: 'specialty-uuid-1',
  name: 'Cardiologia',
  description: 'Doenças do coração',
  linkedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

const makeGlobalDto = (overrides = {}) => ({
  id: 'specialty-uuid-2',
  name: 'Neurologia',
  description: null,
  createdAt: '2024-01-10T10:00:00.000Z',
  updatedAt: '2024-01-10T10:00:00.000Z',
  ...overrides,
})

const makeLinkedPaginated = (items = [makeLinkedDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

const makeGlobalPaginated = (items = [makeGlobalDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

describe('ClinicSpecialtySection (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders loading state initially', () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))
    ;(specialtiesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    expect(screen.getByTestId('clinic-specialty-loading')).toBeInTheDocument()
  })

  it('renders linked specialties on success', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-specialty-name-specialty-uuid-1')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('clinic-specialty-description-specialty-uuid-1')).toHaveTextContent('Doenças do coração')
  })

  it('renders "—" when description is null', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(
      makeLinkedPaginated([makeLinkedDto({ description: null })]),
    )
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-specialty-description-specialty-uuid-1')).toHaveTextContent('—')
  })

  it('renders empty state when no specialties are linked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated())

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-empty')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('clinic-specialty-table')).not.toBeInTheDocument()
  })

  it('renders error state when fetch fails', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockRejectedValue({ status: 500 })
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-list-error')).toBeInTheDocument()
    })
  })

  it('opens link modal when "Vincular" button is clicked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated())

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    expect(screen.getByTestId('clinic-specialty-link-modal')).toBeInTheDocument()
  })

  it('shows available specialties in modal (excluding already linked)', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
      makeGlobalPaginated([
        makeGlobalDto({ id: 'specialty-uuid-2', name: 'Neurologia' }),
        makeGlobalDto({ id: 'specialty-uuid-1', name: 'Cardiologia' }),
      ]),
    )

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-list')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-specialty-modal-item-specialty-uuid-2')).toBeInTheDocument()
    expect(screen.queryByTestId('clinic-specialty-modal-item-specialty-uuid-1')).not.toBeInTheDocument()
  })

  it('shows empty message when all specialties are already linked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
      makeGlobalPaginated([makeGlobalDto({ id: 'specialty-uuid-1', name: 'Cardiologia' })]),
    )

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-empty')).toBeInTheDocument()
    })
  })

  it('calls linkSpecialtyUseCase and shows success message', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated())
    ;(linkSpecialtyUseCase as jest.Mock).mockResolvedValue(makeLinkedDto())

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-list')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-modal-link-button-specialty-uuid-2'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-success')).toBeInTheDocument()
    })

    expect(linkSpecialtyUseCase).toHaveBeenCalledWith(CLINIC_ID, 'specialty-uuid-2')
  })

  it('shows 409 error message when specialty is already linked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated())
    ;(linkSpecialtyUseCase as jest.Mock).mockRejectedValue({ status: 409 })

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-list')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-modal-link-button-specialty-uuid-2'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-error')).toHaveTextContent(
        'já está vinculada a esta clínica',
      )
    })
  })

  it('shows generic error message when link fails with non-409', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated())
    ;(linkSpecialtyUseCase as jest.Mock).mockRejectedValue({ status: 500 })

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-list')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-modal-link-button-specialty-uuid-2'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-error')).toHaveTextContent(
        'Não foi possível vincular a especialidade',
      )
    })
  })

  it('opens unlink confirmation modal when "Desvincular" button is clicked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-button-specialty-uuid-1'))

    expect(screen.getByTestId('clinic-specialty-unlink-modal')).toBeInTheDocument()
    expect(screen.getByTestId('clinic-specialty-unlink-message')).toHaveTextContent('Cardiologia')
  })

  it('calls unlinkSpecialtyUseCase and shows success message after confirm', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))
    ;(unlinkSpecialtyUseCase as jest.Mock).mockResolvedValue(undefined)

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-button-specialty-uuid-1'))
    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-success')).toBeInTheDocument()
    })

    expect(unlinkSpecialtyUseCase).toHaveBeenCalledWith(CLINIC_ID, 'specialty-uuid-1')
  })

  it('closes unlink modal when cancel is clicked', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-button-specialty-uuid-1'))
    expect(screen.getByTestId('clinic-specialty-unlink-modal')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-cancel'))

    await waitFor(() => {
      expect(screen.queryByTestId('clinic-specialty-unlink-modal')).not.toBeInTheDocument()
    })
  })

  it('shows "Todas as especialidades já estão vinculadas." when modal opens with no available specialties and no search', async () => {
    const linkedDto = makeLinkedDto({ specialtyId: 'specialty-uuid-2', name: 'Neurologia' })
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([linkedDto]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
      makeGlobalPaginated([makeGlobalDto({ id: 'specialty-uuid-2' })]),
    )

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-empty')).toBeInTheDocument()
    })

    expect(screen.getByTestId('clinic-specialty-modal-empty')).toHaveTextContent(
      'Todas as especialidades já estão vinculadas.',
    )
  })

  it('shows "Nenhuma especialidade encontrada." when search term yields no matches', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated([]))
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(
      makeGlobalPaginated([makeGlobalDto()]),
    )

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-empty')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-link-button'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-modal-search')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByTestId('clinic-specialty-modal-search'), 'xyzzy')

    await waitFor(
      () => {
        expect(screen.getByTestId('clinic-specialty-modal-empty')).toHaveTextContent(
          'Nenhuma especialidade encontrada.',
        )
      },
      { timeout: 2000 },
    )
  })

  it('shows error message when unlink fails', async () => {
    ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue(makeLinkedPaginated())
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(makeGlobalPaginated([]))
    ;(unlinkSpecialtyUseCase as jest.Mock).mockRejectedValue({ status: 500 })

    renderWithProviders(<ClinicSpecialtySection clinicId={CLINIC_ID} />)

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-table')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-button-specialty-uuid-1'))
    await userEvent.click(screen.getByTestId('clinic-specialty-unlink-confirm'))

    await waitFor(() => {
      expect(screen.getByTestId('clinic-specialty-error')).toHaveTextContent(
        'Não foi possível desvincular a especialidade',
      )
    })
  })
})
