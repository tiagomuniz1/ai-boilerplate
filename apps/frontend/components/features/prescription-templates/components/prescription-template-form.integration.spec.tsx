jest.mock('@/components/features/medications/services/medications.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { medicationsService } from '@/components/features/medications/services/medications.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionTemplateForm } from './prescription-template-form'

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
  isPending: false,
  globalError: null,
  onSubmit: jest.fn(),
}

describe('PrescriptionTemplateForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage() as any)
  })

  it('renders both mode tabs, name field, notes textarea and submit button', () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    expect(screen.getByTestId('prescription-template-form-name')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-tab-medication')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-tab-ingredient')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-notes')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-submit')).toHaveTextContent('Criar modelo')
  })

  it('starts in medication tab by default', () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    expect(screen.getByTestId('prescription-template-form-search')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-template-form-manual-input')).not.toBeInTheDocument()
  })

  it('switches to ingredient tab when clicking Digitar', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))
    expect(screen.getByTestId('prescription-template-form-manual-input')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-template-form-search')).not.toBeInTheDocument()
  })

  it('switches back to medication tab when clicking Buscar medicamento', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-medication'))
    expect(screen.getByTestId('prescription-template-form-search')).toBeInTheDocument()
    expect(screen.queryByTestId('prescription-template-form-manual-input')).not.toBeInTheDocument()
  })

  it('shows medication search results when typing', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-search-results')).toBeInTheDocument()
    })
    expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toHaveTextContent('Dipirona 500mg')
  })

  it('shows no-results message when medication search yields nothing', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([]) as any)
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'xyz')

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-no-results')).toBeInTheDocument()
    })
  })

  it('adds medication to list on click', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))

    expect(screen.getByTestId('prescription-template-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-item-name-0')).toHaveTextContent('Dipirona 500mg')
    expect(screen.getByTestId('prescription-template-form-search')).toHaveValue('')
  })

  it('does not add duplicate medications', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))

    expect(screen.getAllByTestId(/prescription-template-form-item-\d+/)).toHaveLength(1)
  })

  it('removes item from list on remove click', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))

    await userEvent.click(screen.getByTestId('prescription-template-form-item-remove-0'))

    expect(screen.queryByTestId('prescription-template-form-item-0')).not.toBeInTheDocument()
  })

  it('does not add an item when Enter is pressed on an empty manual input', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-template-form-manual-input'), '{Enter}')

    expect(screen.queryByTestId('prescription-template-form-item-0')).not.toBeInTheDocument()
  })

  it('adds manual ingredient item on Adicionar click', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-template-form-manual-input'), 'Amoxicilina')
    await userEvent.click(screen.getByTestId('prescription-template-form-manual-add'))

    expect(screen.getByTestId('prescription-template-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-item-name-0')).toHaveTextContent('Amoxicilina')
    expect(screen.getByTestId('prescription-template-form-manual-input')).toHaveValue('')
  })

  it('adds manual ingredient item on Enter key', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-template-form-manual-input'), 'Metformina{Enter}')

    expect(screen.getByTestId('prescription-template-form-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('prescription-template-form-item-name-0')).toHaveTextContent('Metformina')
  })

  it('Adicionar button is disabled when input is empty', async () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))
    expect(screen.getByTestId('prescription-template-form-manual-add')).toBeDisabled()
  })

  it('shows name required error when submitting without a name', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))
    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp')

    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows items error when submitting with no medications', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo A')
    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-items-error')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with correct payload for medication item', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo A')
    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))

    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp a cada 8 horas')
    await userEvent.type(screen.getByTestId('prescription-template-form-notes'), 'Retornar em 7 dias')

    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Modelo A',
      items: [{ medicationId: 'med-uuid', instructions: 'Tomar 1 cp a cada 8 horas' }],
      notes: 'Retornar em 7 dias',
    })
  })

  it('calls onSubmit with activeIngredientName for manual ingredient item', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo Manual')
    await userEvent.click(screen.getByTestId('prescription-template-form-tab-ingredient'))
    await userEvent.type(screen.getByTestId('prescription-template-form-manual-input'), 'Amoxicilina')
    await userEvent.click(screen.getByTestId('prescription-template-form-manual-add'))

    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp 8/8h')
    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Modelo Manual',
      items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }],
      notes: undefined,
    })
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} isPending />)
    expect(screen.getByTestId('prescription-template-form-submit')).toBeDisabled()
  })

  it('shows globalError alert', () => {
    renderWithProviders(<PrescriptionTemplateForm {...defaultProps} globalError="Erro ao criar modelo." />)
    expect(screen.getByTestId('prescription-template-form-error')).toHaveTextContent('Erro ao criar modelo.')
  })

  describe('edit mode (initialData)', () => {
    const initialData = {
      id: 'tpl-uuid',
      professionalId: 'doctor-uuid',
      professionalName: 'Dr. House',
      name: 'Modelo Existente',
      items: [
        { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
        { medicationId: null, name: 'Manipulado X', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp ao dia' },
      ],
      notes: 'Observação existente',
      isActive: true,
      createdAt: new Date(),
    }

    it('pre-fills name, notes and items from initialData', () => {
      renderWithProviders(<PrescriptionTemplateForm {...defaultProps} initialData={initialData} />)

      expect(screen.getByTestId('prescription-template-form-name')).toHaveValue('Modelo Existente')
      expect(screen.getByTestId('prescription-template-form-notes')).toHaveValue('Observação existente')
      expect(screen.getByTestId('prescription-template-form-item-0')).toBeInTheDocument()
      expect(screen.getByTestId('prescription-template-form-item-1')).toBeInTheDocument()
      expect(screen.getByTestId('prescription-template-form-item-dosage-0')).toHaveValue('500mg')
    })

    it('shows "Salvar alterações" as submit label', () => {
      renderWithProviders(<PrescriptionTemplateForm {...defaultProps} initialData={initialData} />)
      expect(screen.getByTestId('prescription-template-form-submit')).toHaveTextContent('Salvar alterações')
    })

    it('submits updated payload preserving manual item as activeIngredientName', async () => {
      const onSubmit = jest.fn()
      renderWithProviders(<PrescriptionTemplateForm {...defaultProps} initialData={initialData} onSubmit={onSubmit} />)

      await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

      await waitFor(() => expect(onSubmit).toHaveBeenCalled())
      expect(onSubmit.mock.calls[0][0].items).toEqual([
        { medicationId: 'med-uuid', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
        { activeIngredientName: 'Manipulado X', instructions: 'Tomar 1 cp ao dia' },
      ])
    })
  })
})
