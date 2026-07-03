jest.mock('@/components/features/medications/services/medications.service')
jest.mock('@/components/features/prescription-templates/services/prescription-templates.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { medicationsService } from '@/components/features/medications/services/medications.service'
import { prescriptionTemplatesService } from '@/components/features/prescription-templates/services/prescription-templates.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionForm } from './prescription-form'

const mockMedicationsService = medicationsService as jest.Mocked<typeof medicationsService>
const mockPrescriptionTemplatesService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>

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

const makeTemplateDto = (overrides: object = {}) => ({
  id: 'tpl-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. House',
  name: 'Modelo A',
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
  ],
  notes: null,
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
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([])
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

  it('does not add an item when Enter is pressed on an empty manual input', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))

    await userEvent.type(screen.getByTestId('prescription-form-manual-input'), '{Enter}')

    expect(screen.queryByTestId('prescription-form-item-0')).not.toBeInTheDocument()
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

  // ── Templates: load ─────────────────────────────────────────────────────────

  it('does not show load-template button when there are no templates', async () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => expect(mockPrescriptionTemplatesService.getAll).toHaveBeenCalled())
    expect(screen.queryByTestId('prescription-form-load-template-button')).not.toBeInTheDocument()
  })

  it('shows load-template button when templates exist', async () => {
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-load-template-button')).toBeInTheDocument()
    })
  })

  it('opens and closes the load-template modal', async () => {
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-button')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('prescription-form-load-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-modal')).toBeInTheDocument())

    const modal = screen.getByTestId('prescription-form-load-template-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-template-list')).not.toBeInTheDocument()
    })
  })

  it('shows singular/plural medication count and notes preview in the template list', async () => {
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([
      makeTemplateDto({ id: 'tpl-1', notes: 'Retornar em 7 dias' }),
      makeTemplateDto({
        id: 'tpl-2',
        items: [
          { medicationId: 'm1', name: 'Med 1', activeIngredient: null, dosage: null, quantity: null, instructions: 'X' },
          { medicationId: 'm2', name: 'Med 2', activeIngredient: null, dosage: null, quantity: null, instructions: 'X' },
        ],
      }),
    ] as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-load-template-button'))

    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-tpl-1')).toBeInTheDocument())
    expect(screen.getByTestId('prescription-form-load-template-tpl-1')).toHaveTextContent('1 medicamento')
    expect(screen.getByTestId('prescription-form-load-template-tpl-1')).toHaveTextContent('Retornar em 7 dias')
    expect(screen.getByTestId('prescription-form-load-template-tpl-2')).toHaveTextContent('2 medicamentos')
  })

  it('loads a template, replacing items and notes', async () => {
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([
      makeTemplateDto({
        items: [
          { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp 8/8h' },
          { medicationId: null, name: 'Manipulado X', activeIngredient: null, dosage: null, quantity: null, instructions: 'Tomar 1 cp ao dia' },
        ],
        notes: 'Observação do modelo',
      }),
    ] as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-load-template-button'))

    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-load-template-tpl-uuid'))

    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-load-template-modal')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('prescription-form-item-0')).toHaveTextContent('Dipirona 500mg')
    expect(screen.getByTestId('prescription-form-item-dosage-0')).toHaveValue('500mg')
    expect(screen.getByTestId('prescription-form-item-1')).toHaveTextContent('Manipulado X')
    expect(screen.getByTestId('prescription-form-notes')).toHaveValue('Observação do modelo')
  })

  it('loads a template with no notes, clearing the notes field', async () => {
    mockPrescriptionTemplatesService.getAll.mockResolvedValue([makeTemplateDto({ notes: null })] as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-load-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-load-template-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-load-template-tpl-uuid'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-form-notes')).toHaveValue('')
    })
  })

  // ── Templates: save ──────────────────────────────────────────────────────────

  it('does not show save-as-template button when there are no items', () => {
    renderWithProviders(<PrescriptionForm {...defaultProps} />)
    expect(screen.queryByTestId('prescription-form-save-template-button')).not.toBeInTheDocument()
  })

  it('opens and closes the save-as-template modal', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-modal')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('prescription-form-save-template-cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-save-template-name')).not.toBeInTheDocument()
    })
  })

  it('closes the save-as-template modal via the modal close button', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))

    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-modal')).toBeInTheDocument())

    const modal = screen.getByTestId('prescription-form-save-template-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-save-template-name')).not.toBeInTheDocument()
    })
  })

  it('save-template confirm button is disabled when name is empty', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))
    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))

    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-confirm')).toBeInTheDocument())
    expect(screen.getByTestId('prescription-form-save-template-confirm')).toBeDisabled()
  })

  it('does not save when Enter is pressed on an empty template name', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))
    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-name')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-form-save-template-name'), '{Enter}')

    expect(mockPrescriptionTemplatesService.create).not.toHaveBeenCalled()
  })

  it('saves as template with mapped items on confirm click', async () => {
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([makeMed()]) as any)
    mockPrescriptionTemplatesService.create.mockResolvedValue(makeTemplateDto() as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.type(screen.getByTestId('prescription-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-form-search-result-med-uuid'))
    await userEvent.type(screen.getByTestId('prescription-form-item-dosage-0'), '500mg')
    await userEvent.type(screen.getByTestId('prescription-form-item-quantity-0'), '1 caixa')
    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp')
    await userEvent.type(screen.getByTestId('prescription-form-notes'), 'Observação geral')

    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-name')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('prescription-form-save-template-name'), 'Modelo Hipertensão')
    await userEvent.click(screen.getByTestId('prescription-form-save-template-confirm'))

    await waitFor(() => {
      expect(mockPrescriptionTemplatesService.create).toHaveBeenCalledWith({
        name: 'Modelo Hipertensão',
        items: [{ medicationId: 'med-uuid', dosage: '500mg', quantity: '1 caixa', instructions: 'Tomar 1 cp' }],
        notes: 'Observação geral',
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-form-save-template-modal')).not.toBeInTheDocument()
    })
  })

  it('saves as template via Enter key with manual ingredient and no notes', async () => {
    mockPrescriptionTemplatesService.create.mockResolvedValue(makeTemplateDto() as any)
    renderWithProviders(<PrescriptionForm {...defaultProps} />)

    await userEvent.click(screen.getByTestId('prescription-form-tab-ingredient'))
    await userEvent.type(screen.getByTestId('prescription-form-manual-input'), 'Amoxicilina{Enter}')
    await userEvent.type(screen.getByTestId('prescription-form-item-instructions-0'), 'Tomar 1 cp')

    await userEvent.click(screen.getByTestId('prescription-form-save-template-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-form-save-template-name')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('prescription-form-save-template-name'), 'Modelo Manual{Enter}')

    await waitFor(() => {
      expect(mockPrescriptionTemplatesService.create).toHaveBeenCalledWith({
        name: 'Modelo Manual',
        items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp' }],
        notes: undefined,
      })
    })
  })
})
