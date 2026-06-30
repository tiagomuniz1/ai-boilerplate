jest.mock('@/components/features/medications/services/medications.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { medicationsService } from '@/components/features/medications/services/medications.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionForm } from './prescription-form'

const mockMedicationsService = medicationsService as jest.Mocked<typeof medicationsService>

const makeMedPage = (meds: object[] = []) => ({ data: meds, total: meds.length, page: 1, limit: 10 })
const makeMed = (overrides: object = {}) => ({
  id: 'med-uuid',
  name: 'Dipirona 500mg',
  activeIngredient: 'dipirona sódica',
  regulatoryCategory: null,
  therapeuticClass: null,
  holderCompany: null,
  registrationNumber: null,
  registrationStatus: null,
  source: 'anvisa',
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const defaultProps = {
  appointmentId: 'appt-uuid',
  isPending: false,
  globalError: null,
  onSubmit: jest.fn(),
}

describe('PrescriptionForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage() as any)
  })

  // ── Layout ──────────────────────────────────────────────────────────────────

  it('renders both mode tabs, notes textarea and submit button', () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    expect(screen.getByTestId('prescription-form-tab-medication')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-tab-ingredient')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-notes')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-submit')).toBeInTheDocument()
  })

  it('starts in medication tab by default', () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    expect(screen.getByTestId('prescription-form-search')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-form-manual-input')).not.toBeInTheDocument()
  })

  it('switches to ingredient tab when clicking Digitar', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))
    expect(screen.getByTestId('prescription-form-manual-input')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-form-search')).not.toBeInTheDocument()
  })

  it('switches back to medication tab when clicking Buscar medicamento', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))
    await userEvent.click(screen.getByTestId('prescription-form-tab-medication'))
    expect(screen.getByTestId('prescription-form-search')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-form-manual-input')).not.toBeInTheDocument()
  })

  // ── Medication search tab ────────────────────────────────────────────────────

  it('shows medication search results when typing', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')

    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-search-results')).toBeInTheDocument()
    })
    expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toHaveTextContent('Dipirona 500mg')
  })

  it('shows no-results message when medication search yields nothing', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-no-results')).toBeInTheDocument()
    })
  })

  it('adds medication to list on click', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    expect(screen.getByTestId('prescription-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-item-name-0')).toHaveTextContent('Dipirona 500mg')
    expect(screen.getByTestId('prescription-form-search')).toHaveValue('')
  })

  it('does not add duplicate medications', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    expect(screen.getAllByTestId(/prescription-form-item-\d+/)).toHaveLength(1)
  })

  it('removes item from list on remove click', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.click(screen.getByTestId('prescription-form-item-remove-0'))

    expect(screen.queryByTestId('prescription-form-item-0')).not.toBeInTheDocument()
  })

  // ── Ingredient tab (manual text) ─────────────────────────────────────────────

  it('adds manual ingredient item on Adicionar click', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-form-manual-input'), 'Amoxicilina')
    await userEvent.click(screen.getByTestId('prescription-form-manual-add'))

    expect(screen.getByTestId('prescription-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-item-name-0')).toHaveTextContent('Amoxicilina')
    expect(screen.getByTestId('prescription-form-manual-input')).toHaveValue('')
  })

  it('adds manual ingredient item on Enter key', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-form-manual-input'), 'Metformina{Enter}')

    expect(screen.getByTestId('prescription-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-form-item-name-0')).toHaveTextContent('Metformina')
  })

  it('Adicionar button is disabled when input is empty', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))
    expect(screen.getByTestId('prescription-form-manual-add')).toBeDisabled()
  })

  it('calls onSubmit with activeIngredientName for manual ingredient item', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionForm {...defaultProps} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-form-manual-input'), 'Amoxicilina')
    await userEvent.click(screen.getByTestId('prescription-form-manual-add'))

    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp 8/8h')
    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      appointmentId: 'appt-uuid',
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }],
      notes: undefined,
    })
  })

  // ── Validation and submit ────────────────────────────────────────────────────

  it('shows posologia error when submitting without filling instructions', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows items error when submitting with no medications', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-items-error')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct payload for medication item', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp a cada 8 horas')
    await userEvent.type(screen.getByTestId('prescription-form-notes'), 'Retornar em 7 dias')

    await userEvent.click(screen.getByTestId('prescription-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      appointmentId: 'appt-uuid',
      items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp a cada 8 horas' }],
      notes: 'Retornar em 7 dias',
    })
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} isPending />)
    expect(screen.getByTestId('prescription-form-submit')).toBeDisabled()
  })

  it('shows globalError alert', () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} globalError="Consulta cancelada." />)
    expect(screen.getByTestId('prescription-form-error')).toHaveTextContent('Consulta cancelada.')
  })
})
