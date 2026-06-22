jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../services/canonical-fields.service')
jest.mock('../../specialties/services/specialties.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { specialtiesService } from '../../specialties/services/specialties.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateForm } from './template-form'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

const emptySpecialtiesResponse = { data: [], total: 0, page: 1, limit: 100 }

const mockSpecialties = [
  { id: 'spec-uuid', name: 'Cardiologia', description: null, createdAt: new Date(), updatedAt: new Date() },
  { id: 'spec-uuid-2', name: 'Neurologia', description: null, createdAt: new Date(), updatedAt: new Date() },
]

const mockCanonicalFields = [
  {
    id: 'cf-uuid-1',
    canonicalKey: 'blood_pressure',
    label: 'Pressão arterial',
    type: MedicalRecordFieldType.NUMBER,
    options: null,
    unit: 'mmHg',
    specialtyId: null,
    description: null,
    isActive: true,
  },
]

describe('TemplateForm (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([])
    ;(specialtiesService.getAll as jest.Mock).mockResolvedValue(emptySpecialtiesResponse)
  })

  describe('create mode', () => {
    const mockOnSubmit = jest.fn()

    function renderCreate() {
      return renderWithProviders(
        <TemplateForm
          mode="create"
          specialtyId="spec-uuid"
          onSubmit={mockOnSubmit}
          isPending={false}
        />,
      )
    }

    it('renders name field, specialty select and add field button', () => {
      renderCreate()
      expect(screen.getByTestId('template-form-name')).toBeInTheDocument()
      expect(screen.getByTestId('template-form-specialty')).toBeInTheDocument()
      expect(screen.getByTestId('template-form-add-field')).toBeInTheDocument()
    })

    it('populates specialty select with available specialties', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({
        data: mockSpecialties,
        total: 2,
        page: 1,
        limit: 100,
      })
      renderCreate()

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Cardiologia' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Neurologia' })).toBeInTheDocument()
      })
    })

    it('shows validation error when no specialty selected', async () => {
      renderWithProviders(
        <TemplateForm mode="create" specialtyId="" onSubmit={jest.fn()} isPending={false} />,
      )
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'Sintoma')
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('template-form-specialty-error')).toBeInTheDocument()
      })
    })

    it('pre-selects specialty when specialtyId prop provided and options load', async () => {
      ;(specialtiesService.getAll as jest.Mock).mockResolvedValue({
        data: mockSpecialties,
        total: 2,
        page: 1,
        limit: 100,
      })
      renderCreate()

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Cardiologia' })).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-form-specialty')).toHaveValue('spec-uuid')
    })

    it('shows empty state when no fields added', () => {
      renderCreate()
      expect(screen.getByTestId('template-form-fields-empty')).toBeInTheDocument()
    })

    it('adds field editor when add field clicked', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
    })

    it('removes field editor when remove clicked', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()

      await userEvent.click(screen.getByTestId('field-editor-remove-0'))
      expect(screen.queryByTestId('field-editor-0')).not.toBeInTheDocument()
    })

    it('disables move-up on first field', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.click(screen.getByTestId('template-form-add-field'))

      expect(screen.getByTestId('field-editor-move-up-0')).toBeDisabled()
      expect(screen.getByTestId('field-editor-move-down-0')).not.toBeDisabled()
    })

    it('disables move-down on last field', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.click(screen.getByTestId('template-form-add-field'))

      expect(screen.getByTestId('field-editor-move-down-1')).toBeDisabled()
      expect(screen.getByTestId('field-editor-move-up-1')).not.toBeDisabled()
    })

    it('shows validation error when name is empty on submit', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(screen.getByText('Mínimo 2 caracteres')).toBeInTheDocument()
      })
    })

    it('shows validation error when no fields added', async () => {
      renderCreate()
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('template-form-fields-error')).toBeInTheDocument()
      })
    })

    it('shows options panel for SELECT type field', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))

      await userEvent.selectOptions(screen.getByTestId('field-editor-type-0'), MedicalRecordFieldType.SELECT)

      await waitFor(() => {
        expect(screen.getByTestId('field-editor-options-0')).toBeInTheDocument()
      })
    })

    it('shows validation error for SELECT field with no options on submit', async () => {
      renderCreate()
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'Diagnóstico')
      await userEvent.selectOptions(screen.getByTestId('field-editor-type-0'), MedicalRecordFieldType.SELECT)
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(screen.getByTestId('field-editor-options-error-0')).toBeInTheDocument()
      })
    })

    it('removes an option when remove button is clicked', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.selectOptions(screen.getByTestId('field-editor-type-0'), MedicalRecordFieldType.SELECT)

      await waitFor(() => expect(screen.getByTestId('field-editor-options-0')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('field-editor-option-add-0'))

      await waitFor(() => expect(screen.getByTestId('field-editor-option-value-0-0')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('field-editor-option-remove-0-0'))

      await waitFor(() =>
        expect(screen.queryByTestId('field-editor-option-value-0-0')).not.toBeInTheDocument(),
      )
    })

    it('shows per-option validation error for empty option value', async () => {
      renderCreate()
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'Diagnóstico')
      await userEvent.selectOptions(screen.getByTestId('field-editor-type-0'), MedicalRecordFieldType.SELECT)

      await waitFor(() => expect(screen.getByTestId('field-editor-options-0')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('field-editor-option-add-0'))
      await waitFor(() => expect(screen.getByTestId('field-editor-option-value-0-0')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0))
    })

    it('calls onSubmit with correct data', async () => {
      renderCreate()
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'Sintoma')
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Anamnese',
            specialtyId: 'spec-uuid',
            fields: expect.arrayContaining([
              expect.objectContaining({ label: 'Sintoma', type: MedicalRecordFieldType.TEXT }),
            ]),
          }),
        )
      })
    })

    it('disables submit while isPending', () => {
      renderWithProviders(
        <TemplateForm mode="create" specialtyId="spec-uuid" onSubmit={jest.fn()} isPending={true} />,
      )
      expect(screen.getByTestId('template-form-submit')).toBeDisabled()
    })

    it('shows global error when provided', () => {
      renderWithProviders(
        <TemplateForm
          mode="create"
          specialtyId="spec-uuid"
          onSubmit={jest.fn()}
          isPending={false}
          globalError="Erro inesperado"
        />,
      )
      expect(screen.getByTestId('template-form-global-error')).toHaveTextContent('Erro inesperado')
    })

    it('loads and shows canonical fields picker', async () => {
      ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue(mockCanonicalFields)
      renderCreate()

      await waitFor(() => {
        expect(screen.getByTestId(`canonical-field-picker-item-cf-uuid-1`)).toBeInTheDocument()
      })
    })

    it('adopts canonical field on button click', async () => {
      ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue(mockCanonicalFields)
      renderCreate()

      await waitFor(() => {
        expect(screen.getByTestId('canonical-field-picker-adopt-cf-uuid-1')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('canonical-field-picker-adopt-cf-uuid-1'))

      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
      expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Pressão arterial')
    })

    it('adopts canonical field with options populated', async () => {
      const canonicalFieldWithOptions = {
        id: 'cf-uuid-2',
        canonicalKey: 'severity',
        label: 'Gravidade',
        type: MedicalRecordFieldType.SELECT,
        options: [
          { value: 'low', label: 'Baixo' },
          { value: 'high', label: 'Alto' },
        ],
        unit: null,
        specialtyId: null,
        description: null,
        isActive: true,
      }
      ;(canonicalFieldsService.getAll as jest.Mock).mockResolvedValue([canonicalFieldWithOptions])
      renderCreate()

      await waitFor(() => {
        expect(screen.getByTestId('canonical-field-picker-adopt-cf-uuid-2')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('canonical-field-picker-adopt-cf-uuid-2'))

      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
      expect(screen.getByTestId('field-editor-options-0')).toBeInTheDocument()
    })

    it('moves a field up when move-up button is clicked', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.click(screen.getByTestId('template-form-add-field'))

      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'First')
      await userEvent.type(screen.getByTestId('field-editor-label-1'), 'Second')

      await userEvent.click(screen.getByTestId('field-editor-move-up-1'))

      await waitFor(() => {
        expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Second')
        expect(screen.getByTestId('field-editor-label-1')).toHaveValue('First')
      })
    })

    it('moves a field down when move-down button is clicked', async () => {
      renderCreate()
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.click(screen.getByTestId('template-form-add-field'))

      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'First')
      await userEvent.type(screen.getByTestId('field-editor-label-1'), 'Second')

      await userEvent.click(screen.getByTestId('field-editor-move-down-0'))

      await waitFor(() => {
        expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Second')
        expect(screen.getByTestId('field-editor-label-1')).toHaveValue('First')
      })
    })

    it('blocks submission when SELECT field has duplicate option values', async () => {
      renderCreate()
      await userEvent.type(screen.getByTestId('template-form-name'), 'Anamnese')
      await userEvent.click(screen.getByTestId('template-form-add-field'))
      await userEvent.type(screen.getByTestId('field-editor-label-0'), 'Diagnóstico')
      await userEvent.selectOptions(
        screen.getByTestId('field-editor-type-0'),
        MedicalRecordFieldType.SELECT,
      )

      await waitFor(() => {
        expect(screen.getByTestId('field-editor-options-0')).toBeInTheDocument()
      })

      await userEvent.click(screen.getByTestId('field-editor-option-add-0'))
      await waitFor(() =>
        expect(screen.getByTestId('field-editor-option-value-0-0')).toBeInTheDocument(),
      )
      await userEvent.type(screen.getByTestId('field-editor-option-value-0-0'), 'opt')
      await userEvent.type(screen.getByTestId('field-editor-option-label-0-0'), 'Opção 1')

      await userEvent.click(screen.getByTestId('field-editor-option-add-0'))
      await waitFor(() =>
        expect(screen.getByTestId('field-editor-option-value-0-1')).toBeInTheDocument(),
      )
      await userEvent.type(screen.getByTestId('field-editor-option-value-0-1'), 'opt')
      await userEvent.type(screen.getByTestId('field-editor-option-label-0-1'), 'Opção 2')

      await userEvent.click(screen.getByTestId('template-form-submit'))

      // zod superRefine duplicate check runs and blocks submission
      await new Promise((r) => setTimeout(r, 0))
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('edit mode', () => {
    const existingTemplate = {
      id: 'tpl-uuid',
      specialtyId: 'spec-uuid',
      specialtyName: 'Cardiologia',
      name: 'Anamnese Cardíaca',
      fields: [
        {
          key: 'complaint',
          label: 'Queixa principal',
          type: MedicalRecordFieldType.TEXT,
          required: true,
          order: 0,
          options: null,
          placeholder: null,
          helpText: null,
          canonical: false,
          canonicalKey: null,
        },
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    function renderEdit(onSubmit = jest.fn()) {
      return renderWithProviders(
        <TemplateForm
          mode="edit"
          template={existingTemplate}
          specialtyId="spec-uuid"
          onSubmit={onSubmit}
          isPending={false}
        />,
      )
    }

    it('renders with pre-filled name and field from template', async () => {
      renderEdit()

      expect(screen.getByTestId('template-form-name')).toHaveValue('Anamnese Cardíaca')
      expect(screen.getByTestId('field-editor-0')).toBeInTheDocument()
      expect(screen.getByTestId('field-editor-label-0')).toHaveValue('Queixa principal')
    })

    it('calls onSubmit in edit mode with updated data', async () => {
      const onSubmit = jest.fn()
      renderEdit(onSubmit)

      await userEvent.clear(screen.getByTestId('template-form-name'))
      await userEvent.type(screen.getByTestId('template-form-name'), 'Atualizada')
      await userEvent.click(screen.getByTestId('template-form-submit'))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Atualizada',
          }),
        )
      })
    })

    it('pre-fills placeholder and helpText from template field', async () => {
      const templateWithHints = {
        ...existingTemplate,
        fields: [
          {
            key: 'complaint',
            label: 'Queixa principal',
            type: MedicalRecordFieldType.TEXT,
            required: false,
            order: 0,
            options: null,
            placeholder: 'Ex: dor de cabeça',
            helpText: 'Descreva o sintoma principal',
            canonical: false,
            canonicalKey: null,
          },
        ],
      }

      renderWithProviders(
        <TemplateForm
          mode="edit"
          template={templateWithHints}
          specialtyId="spec-uuid"
          onSubmit={jest.fn()}
          isPending={false}
        />,
      )

      expect(screen.getByTestId('field-editor-placeholder-0')).toHaveValue('Ex: dor de cabeça')
      expect(screen.getByTestId('field-editor-help-text-0')).toHaveValue('Descreva o sintoma principal')
    })

    it('pre-fills SELECT field options from template', async () => {
      const templateWithOptions = {
        ...existingTemplate,
        fields: [
          {
            key: 'severity',
            label: 'Gravidade',
            type: MedicalRecordFieldType.SELECT,
            required: false,
            order: 0,
            options: [
              { value: 'low', label: 'Baixo' },
              { value: 'high', label: 'Alto' },
            ],
            placeholder: null,
            helpText: null,
            canonical: false,
            canonicalKey: null,
          },
        ],
      }

      renderWithProviders(
        <TemplateForm
          mode="edit"
          template={templateWithOptions}
          specialtyId="spec-uuid"
          onSubmit={jest.fn()}
          isPending={false}
        />,
      )

      expect(screen.getByTestId('field-editor-option-value-0-0')).toHaveValue('low')
      expect(screen.getByTestId('field-editor-option-value-0-1')).toHaveValue('high')
    })
  })
})
