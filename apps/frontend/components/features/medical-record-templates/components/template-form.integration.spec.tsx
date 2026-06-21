jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug') }))
jest.mock('../services/canonical-fields.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { MedicalRecordFieldType } from '@app/shared'
import { canonicalFieldsService } from '../services/canonical-fields.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateForm } from './template-form'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

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

    it('renders name field and add field button', () => {
      renderCreate()
      expect(screen.getByTestId('template-form-name')).toBeInTheDocument()
      expect(screen.getByTestId('template-form-add-field')).toBeInTheDocument()
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
  })
})
