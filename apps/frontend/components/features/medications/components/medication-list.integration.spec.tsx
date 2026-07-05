jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice') }))
jest.mock('../services/medications.service')
jest.mock('../use-cases/update-medication.use-case')
jest.mock('../use-cases/delete-medication.use-case')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { MedicationSource } from '@app/shared'
import { medicationsService } from '../services/medications.service'
import { updateMedicationUseCase } from '../use-cases/update-medication.use-case'
import { deleteMedicationUseCase } from '../use-cases/delete-medication.use-case'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicationList } from './medication-list'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

const makeDto = (overrides = {}) => ({
  id: 'm1',
  name: 'Dipirona Sódica',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: 'Genérico',
  therapeuticClass: 'ANALGESICOS',
  holderCompany: 'ACME',
  registrationNumber: '123',
  registrationStatus: 'Ativo',
  source: MedicationSource.ANVISA,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

const page = (dtos: object[], total = dtos.length) => ({ data: dtos, total, page: 1, limit: 20 })

describe('MedicationList (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders the skeleton while loading', () => {
    ;(medicationsService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))
    renderWithProviders(<MedicationList />)
    expect(screen.getByTestId('medication-list-skeleton')).toBeInTheDocument()
  })

  it('renders the table with medications on success', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-table')).toBeInTheDocument())
    expect(screen.getByTestId('medication-name-m1')).toHaveTextContent('Dipirona Sódica')
    expect(screen.getByTestId('medication-source-m1')).toHaveTextContent('ANVISA')
    expect(screen.getByTestId('medication-status-m1')).toHaveTextContent('Ativo')
  })

  it('renders the Inativo status and placeholders for missing fields', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(
      page([makeDto({ isActive: false, activeIngredient: null, therapeuticClass: null })]),
    )
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-status-m1')).toHaveTextContent('Inativo'))
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('activates an inactive medication after confirmation', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto({ isActive: false })]))
    ;(updateMedicationUseCase as jest.Mock).mockResolvedValue({ id: 'm1', isActive: true })
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-toggle-button-m1')).toHaveTextContent('Ativar'))
    await userEvent.click(screen.getByTestId('medication-toggle-button-m1'))
    await userEvent.click(screen.getByTestId('medication-toggle-dialog-confirm'))

    await waitFor(() => expect(updateMedicationUseCase).toHaveBeenCalledWith('m1', { isActive: true }))
    await waitFor(() => expect(screen.getByTestId('medication-list-success')).toHaveTextContent('ativado'))
  })

  it('renders the empty state', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([], 0))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-empty')).toBeInTheDocument())
    expect(screen.getByTestId('medication-list-empty')).toHaveTextContent('Nenhum medicamento cadastrado.')
  })

  it('renders the error state', async () => {
    ;(medicationsService.getAll as jest.Mock).mockRejectedValue(new Error('boom'))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-error')).toBeInTheDocument())
  })

  it('debounces the search and forwards it to the service', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-table')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('medication-list-search'), 'dipi')

    await waitFor(() =>
      expect(medicationsService.getAll).toHaveBeenCalledWith(expect.objectContaining({ search: 'dipi' })),
    )
  })

  it('requests inactive medications when the toggle is checked', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-table')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-list-include-inactive'))

    await waitFor(() =>
      expect(medicationsService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ includeInactive: true }),
      ),
    )
  })

  it('paginates to the next page', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()], 40))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-list-page-info')).toHaveTextContent('Página 1 de 2'))
    expect(screen.getByTestId('medication-list-prev-page')).toBeDisabled()

    await userEvent.click(screen.getByTestId('medication-list-next-page'))

    await waitFor(() =>
      expect(medicationsService.getAll).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    )
    expect(screen.getByTestId('medication-list-page-info')).toHaveTextContent('Página 2 de 2')

    await userEvent.click(screen.getByTestId('medication-list-prev-page'))
    await waitFor(() =>
      expect(screen.getByTestId('medication-list-page-info')).toHaveTextContent('Página 1 de 2'),
    )
  })

  it('deactivates a medication after confirmation', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    ;(updateMedicationUseCase as jest.Mock).mockResolvedValue({ id: 'm1', isActive: false })
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-toggle-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-toggle-button-m1'))
    await userEvent.click(screen.getByTestId('medication-toggle-dialog-confirm'))

    await waitFor(() =>
      expect(updateMedicationUseCase).toHaveBeenCalledWith('m1', { isActive: false }),
    )
    await waitFor(() => expect(screen.getByTestId('medication-list-success')).toBeInTheDocument())
  })

  it('deletes a medication after confirmation', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    ;(deleteMedicationUseCase as jest.Mock).mockResolvedValue(undefined)
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-delete-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-delete-button-m1'))
    await userEvent.click(screen.getByTestId('medication-delete-dialog-confirm'))

    await waitFor(() => expect(deleteMedicationUseCase).toHaveBeenCalledWith('m1'))
    await waitFor(() => expect(screen.getByTestId('medication-list-success')).toBeInTheDocument())
  })

  it('shows an error message when deletion fails', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    ;(deleteMedicationUseCase as jest.Mock).mockRejectedValue({ status: 500 })
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-delete-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-delete-button-m1'))
    await userEvent.click(screen.getByTestId('medication-delete-dialog-confirm'))

    await waitFor(() => expect(screen.getByTestId('medication-list-action-error')).toBeInTheDocument())
  })

  it('shows a search-specific empty message when a search yields no results', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([], 0))
    renderWithProviders(<MedicationList />)

    await userEvent.type(screen.getByTestId('medication-list-search'), 'zzz')

    await waitFor(() =>
      expect(screen.getByTestId('medication-list-empty')).toHaveTextContent(
        'Nenhum medicamento encontrado para a busca realizada.',
      ),
    )
  })

  it('closes the toggle and delete dialogs on cancel', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-toggle-button-m1')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('medication-toggle-button-m1'))
    await userEvent.click(screen.getByTestId('medication-toggle-dialog-cancel'))
    await waitFor(() => expect(screen.queryByTestId('medication-toggle-dialog')).not.toBeInTheDocument())

    await userEvent.click(screen.getByTestId('medication-delete-button-m1'))
    await userEvent.click(screen.getByTestId('medication-delete-dialog-cancel'))
    await waitFor(() => expect(screen.queryByTestId('medication-delete-dialog')).not.toBeInTheDocument())
  })

  it('shows an error message when toggling fails', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))
    ;(updateMedicationUseCase as jest.Mock).mockRejectedValue({ status: 500 })
    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-toggle-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-toggle-button-m1'))
    await userEvent.click(screen.getByTestId('medication-toggle-dialog-confirm'))

    await waitFor(() => expect(screen.getByTestId('medication-list-action-error')).toBeInTheDocument())
  })

  it('renders a mobile card per medication with name and details', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))

    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-card-m1')).toBeInTheDocument())

    expect(screen.getByTestId('medication-card-m1-title')).toHaveTextContent('Dipirona Sódica')
    expect(screen.getByTestId('medication-card-edit-link-m1')).toBeInTheDocument()
  })

  it('mobile card toggle button opens the toggle dialog', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))

    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-card-toggle-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-card-toggle-button-m1'))

    expect(screen.getByTestId('medication-toggle-dialog')).toBeInTheDocument()
  })

  it('mobile card delete button opens the delete dialog', async () => {
    ;(medicationsService.getAll as jest.Mock).mockResolvedValue(page([makeDto()]))

    renderWithProviders(<MedicationList />)

    await waitFor(() => expect(screen.getByTestId('medication-card-delete-button-m1')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medication-card-delete-button-m1'))

    expect(screen.getByTestId('medication-delete-dialog')).toBeInTheDocument()
  })
})
