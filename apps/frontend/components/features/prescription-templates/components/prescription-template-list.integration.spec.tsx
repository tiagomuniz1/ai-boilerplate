jest.mock('../services/prescription-templates.service')
jest.mock('@/components/features/medications/services/medications.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { prescriptionTemplatesService } from '../services/prescription-templates.service'
import { medicationsService } from '@/components/features/medications/services/medications.service'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PrescriptionTemplateList } from './prescription-template-list'

const mockService = prescriptionTemplatesService as jest.Mocked<typeof prescriptionTemplatesService>
const mockMedicationsService = medicationsService as jest.Mocked<typeof medicationsService>

const makeUser = (role: UserRole) => ({
  id: 'user-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  clinicId: 'clinic-uuid',
})

const makeTemplateDto = (overrides: object = {}) => ({
  id: 'tpl-uuid',
  doctorId: 'doctor-uuid',
  doctorName: 'Dr. House',
  name: 'Modelo A',
  items: [
    { medicationId: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: null, quantity: null, instructions: 'Tomar 1 cp' },
  ],
  notes: null,
  isActive: true,
  createdAt: new Date().toISOString(),
  ...overrides,
})

const makeMedPage = (meds: object[] = []) => ({ data: meds, total: meds.length, page: 1, limit: 10 })

describe('PrescriptionTemplateList (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: makeUser(UserRole.DOCTOR) })
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage() as any)
  })

  it('renders skeleton while loading', () => {
    mockService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<PrescriptionTemplateList />)
    expect(screen.getByTestId('prescription-template-list-skeleton')).toBeInTheDocument()
  })

  it('renders error state when fetch fails', async () => {
    mockService.getAll.mockRejectedValue(new Error('Network error'))
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-error')).toBeInTheDocument()
    })
  })

  it('renders empty state when no templates', async () => {
    mockService.getAll.mockResolvedValue([])
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-empty')).toBeInTheDocument()
    })
  })

  it('renders table with templates on success', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-table')).toBeInTheDocument()
    })
    expect(screen.getByTestId('prescription-template-name-tpl-uuid')).toHaveTextContent('Modelo A')
    expect(within(screen.getByTestId('prescription-template-list-table')).getByText('1 medicamento')).toBeInTheDocument()
  })

  it('shows plural medication count for multiple items', async () => {
    mockService.getAll.mockResolvedValue([
      makeTemplateDto({
        items: [
          { medicationId: 'm1', name: 'Med 1', activeIngredient: null, dosage: null, quantity: null, instructions: 'X' },
          { medicationId: 'm2', name: 'Med 2', activeIngredient: null, dosage: null, quantity: null, instructions: 'X' },
        ],
      }),
    ] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-table')).toBeInTheDocument()
    })
    expect(
      within(screen.getByTestId('prescription-template-list-table')).getByText('2 medicamentos'),
    ).toBeInTheDocument()
  })

  it('shows singular count message in header', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByText('1 modelo cadastrado')).toBeInTheDocument()
    })
  })

  it('shows plural count message in header', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto({ id: 't1' }), makeTemplateDto({ id: 't2' })] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByText('2 modelos cadastrados')).toBeInTheDocument()
    })
  })

  it('shows doctor column for ADMIN', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-doctor-tpl-uuid')).toHaveTextContent('Dr. House')
    })
  })

  it('hides doctor column for DOCTOR', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-table')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-template-doctor-tpl-uuid')).not.toBeInTheDocument()
  })

  it('shows "Novo modelo" button for DOCTOR', async () => {
    mockService.getAll.mockResolvedValue([])
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument()
    })
  })

  it('hides "Novo modelo" button for ADMIN', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockService.getAll.mockResolvedValue([])
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-list-empty')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-template-list-new-button')).not.toBeInTheDocument()
  })

  it('shows edit link for DOCTOR', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument()
    })
  })

  it('hides edit link for ADMIN', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-name-tpl-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('prescription-template-edit-tpl-uuid')).not.toBeInTheDocument()
  })

  it('always shows delete link regardless of role', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-delete-tpl-uuid')).toBeInTheDocument()
    })
  })

  it('opens create modal when "Novo modelo" is clicked', async () => {
    mockService.getAll.mockResolvedValue([])
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-list-new-button'))
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-create-modal')).toBeInTheDocument()
    })
  })

  it('closes create modal when closed', async () => {
    mockService.getAll.mockResolvedValue([])
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-list-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-create-modal')).toBeInTheDocument())
    const modal = screen.getByTestId('prescription-template-create-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-template-create-modal')).not.toBeInTheDocument()
    })
  })

  it('creates a template and closes the modal on success', async () => {
    mockService.getAll.mockResolvedValue([])
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([{ id: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica' }]) as any)
    mockService.create.mockResolvedValue(makeTemplateDto() as any)

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-list-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo A')
    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))
    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp')
    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-template-create-modal')).not.toBeInTheDocument()
    })
  })

  it('shows create error when creation fails', async () => {
    mockService.getAll.mockResolvedValue([])
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([{ id: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica' }]) as any)
    mockService.create.mockRejectedValue({ detail: 'Modelo inválido' })

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-list-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo A')
    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))
    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp')
    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-error')).toHaveTextContent('Modelo inválido')
    })
  })

  it('shows generic create error when detail is missing', async () => {
    mockService.getAll.mockResolvedValue([])
    mockMedicationsService.getAll.mockResolvedValue(makeMedPage([{ id: 'med-uuid', name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica' }]) as any)
    mockService.create.mockRejectedValue({})

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-list-new-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-list-new-button'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.type(screen.getByTestId('prescription-template-form-name'), 'Modelo A')
    await userEvent.type(screen.getByTestId('prescription-template-form-search'), 'dipi')
    await waitFor(() => expect(screen.getByTestId('prescription-template-form-search-result-med-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-form-search-result-med-uuid'))
    await userEvent.type(screen.getByTestId('prescription-template-form-item-instructions-0'), 'Tomar 1 cp')
    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-error')).toHaveTextContent('Erro ao criar modelo. Tente novamente.')
    })
  })

  it('opens edit modal when Editar is clicked', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-edit-tpl-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-edit-modal')).toBeInTheDocument()
    })
  })

  it('closes edit modal when closed', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-edit-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-modal')).toBeInTheDocument())
    const modal = screen.getByTestId('prescription-template-edit-modal')
    await userEvent.click(within(modal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-template-edit-modal')).not.toBeInTheDocument()
    })
  })

  it('updates a template and closes the modal on success', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    mockService.update.mockResolvedValue(makeTemplateDto({ name: 'Modelo Renomeado' }) as any)

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-edit-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(mockService.update).toHaveBeenCalledWith('tpl-uuid', expect.any(Object))
    })
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-template-edit-modal')).not.toBeInTheDocument()
    })
  })

  it('shows edit error when update fails', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    mockService.update.mockRejectedValue({ detail: 'Modelo inválido' })

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-edit-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-error')).toHaveTextContent('Modelo inválido')
    })
  })

  it('shows generic edit error when detail is missing', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    mockService.update.mockRejectedValue({})

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-edit-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-edit-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-form')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('prescription-template-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-form-error')).toHaveTextContent('Erro ao atualizar modelo. Tente novamente.')
    })
  })

  it('opens delete dialog on delete click', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-delete-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-delete-tpl-uuid'))
    await waitFor(() => {
      expect(screen.getByTestId('prescription-template-delete-dialog')).toBeInTheDocument()
    })
  })

  it('closes delete dialog on cancel', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-delete-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-delete-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-delete-dialog')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-delete-dialog-cancel'))
    await waitFor(() => {
      expect(screen.queryByTestId('prescription-template-delete-dialog-cancel')).not.toBeInTheDocument()
    })
  })

  it('deletes a template when confirmed', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)
    mockService.remove.mockResolvedValue(undefined as any)

    renderWithProviders(<PrescriptionTemplateList />)
    await waitFor(() => expect(screen.getByTestId('prescription-template-delete-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-delete-tpl-uuid'))
    await waitFor(() => expect(screen.getByTestId('prescription-template-delete-dialog-confirm')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-delete-dialog-confirm'))

    await waitFor(() => {
      expect(mockService.remove).toHaveBeenCalledWith('tpl-uuid')
    })
  })

  it('renders a mobile card per template with name and medication count', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)

    renderWithProviders(<PrescriptionTemplateList />)

    await waitFor(() => expect(screen.getByTestId('prescription-template-card-tpl-uuid')).toBeInTheDocument())

    expect(screen.getByTestId('prescription-template-card-tpl-uuid-title')).toHaveTextContent('Modelo A')
    expect(screen.getByTestId('prescription-template-card-edit-tpl-uuid')).toBeInTheDocument()
  })

  it('mobile card shows Médico row for ADMIN and hides the edit action (read-only)', async () => {
    useAuthStore.setState({ user: makeUser(UserRole.ADMIN) })
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)

    renderWithProviders(<PrescriptionTemplateList />)

    await waitFor(() => expect(screen.getByTestId('prescription-template-card-tpl-uuid')).toBeInTheDocument())

    expect(screen.getByTestId('prescription-template-card-tpl-uuid')).toHaveTextContent('Dr. House')
    expect(screen.queryByTestId('prescription-template-card-edit-tpl-uuid')).not.toBeInTheDocument()
  })

  it('clicking delete on a mobile card opens the delete dialog', async () => {
    mockService.getAll.mockResolvedValue([makeTemplateDto()] as any)

    renderWithProviders(<PrescriptionTemplateList />)

    await waitFor(() => expect(screen.getByTestId('prescription-template-card-delete-tpl-uuid')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('prescription-template-card-delete-tpl-uuid'))

    expect(screen.getByTestId('prescription-template-delete-dialog-confirm')).toBeInTheDocument()
  })
})
