jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice'), useBasePath: () => '/backoffice' }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { MedicalRecordFieldType } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CanonicalFieldForm } from './canonical-field-form'
import type { ICanonicalFieldModel } from '../types/canonical-field-model.types'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

const existingField: ICanonicalFieldModel = {
  id: 'uuid-1',
  canonicalKey: 'blood_pressure',
  label: 'Pressão arterial',
  type: MedicalRecordFieldType.NUMBER,
  options: null,
  unit: 'mmHg',
  description: 'Desc existente',
  isActive: true,
}


describe('CanonicalFieldForm (integration) — create mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders all fields', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('canonical-field-form-canonical-key')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-field-form-label')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-field-form-type')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-field-form-unit')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-field-form-description')).toBeInTheDocument()
  })

  it('calls onSubmit with form values on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'weight')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Peso')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.NUMBER)

    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error for invalid canonicalKey format', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'Invalid Key!')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Label')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.TEXT)
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(
        screen.getByText(/use apenas letras minúsculas/i),
      ).toBeInTheDocument()
    })
  })

  it('shows validation error when label is too short', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'weight')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'P')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.NUMBER)
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Deve ter no mínimo 2 caracteres')).toBeInTheDocument()
    })
  })

  it('shows options editor when type is SELECT', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.SELECT)

    expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
  })

  it('shows options editor when type is MULTISELECT', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.MULTISELECT)

    expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
  })

  it('hides options editor when type is not SELECT/MULTISELECT', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.TEXT)

    expect(screen.queryByTestId('canonical-field-options-editor')).not.toBeInTheDocument()
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="create"
        isPending={false}
        globalError="Chave já cadastrada."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('canonical-field-form-error')).toHaveTextContent('Chave já cadastrada.')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('canonical-field-form-submit')).toBeDisabled()
  })

  // O catálogo é global — o formulário não oferece escopo por especialidade.
  it('has no specialty field', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.queryByTestId('canonical-field-form-specialty')).not.toBeInTheDocument()
  })

  it('shows options error when SELECT type submitted with no options', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'severity')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Gravidade')
    await userEvent.selectOptions(
      screen.getByTestId('canonical-field-form-type'),
      MedicalRecordFieldType.SELECT,
    )
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(
        screen.getByText('Adicione ao menos uma opção para este tipo de campo.'),
      ).toBeInTheDocument()
    })
  })

  it('shows type error when form submitted without selecting a type', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'weight')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Peso')
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows description error when description exceeds maximum length', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'weight')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Peso')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.NUMBER)
    await userEvent.type(screen.getByTestId('canonical-field-form-description'), 'a'.repeat(501))
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(screen.getByText(/máximo/i)).toBeInTheDocument()
    })
  })

  it('includes optional unit and description in onSubmit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'weight')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Peso')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.NUMBER)
    await userEvent.type(screen.getByTestId('canonical-field-form-unit'), 'kg')
    await userEvent.type(screen.getByTestId('canonical-field-form-description'), 'Peso corporal do paciente')
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          unit: 'kg',
          description: 'Peso corporal do paciente',
        }),
        expect.any(Function),
      )
    })
  })

  it('includes options in onSubmit for SELECT type with options', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'severity')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Gravidade')
    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.SELECT)

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))
    await waitFor(() => expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('canonical-field-option-value-0'), 'low')
    await userEvent.type(screen.getByTestId('canonical-field-option-label-0'), 'Baixo')

    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          options: [{ value: 'low', label: 'Baixo' }],
        }),
        expect.any(Function),
      )
    })
  })

  it('blocks submission when SELECT type has duplicate option values', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <CanonicalFieldForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('canonical-field-form-canonical-key'), 'severity')
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'Gravidade')
    await userEvent.selectOptions(
      screen.getByTestId('canonical-field-form-type'),
      MedicalRecordFieldType.SELECT,
    )

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))
    await waitFor(() => expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('canonical-field-option-value-0'), 'low')
    await userEvent.type(screen.getByTestId('canonical-field-option-label-0'), 'Baixo')

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))
    await waitFor(() => expect(screen.getByTestId('canonical-field-option-row-1')).toBeInTheDocument())
    await userEvent.type(screen.getByTestId('canonical-field-option-value-1'), 'low')
    await userEvent.type(screen.getByTestId('canonical-field-option-label-1'), 'Baixo 2')

    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    // zod superRefine duplicate check runs and blocks submission
    await new Promise((r) => setTimeout(r, 0))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})

describe('CanonicalFieldForm (integration) — edit mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows canonicalKey as readonly', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-canonical-key-readonly')).toHaveTextContent('blood_pressure')
    })

    expect(screen.queryByTestId('canonical-field-form-canonical-key')).not.toBeInTheDocument()
  })

  it('pre-fills form with existing field data', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-label')).toHaveValue('Pressão arterial')
    })

    expect(screen.getByTestId('canonical-field-form-unit')).toHaveValue('mmHg')
    expect(screen.getByTestId('canonical-field-form-description')).toHaveValue('Desc existente')
  })

  it('calls onSubmit with updated values', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-label')).toHaveValue('Pressão arterial')
    })

    await userEvent.clear(screen.getByTestId('canonical-field-form-label'))
    await userEvent.type(screen.getByTestId('canonical-field-form-label'), 'PA')
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'PA' }),
        expect.any(Function),
      )
    })
  })

  it('resets unit and description to empty string when they are null in defaultValues', async () => {
    const fieldWithNulls: ICanonicalFieldModel = {
      ...existingField,
      unit: null,
      description: null,
    }

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={fieldWithNulls}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-unit')).toHaveValue('')
    })

    expect(screen.getByTestId('canonical-field-form-description')).toHaveValue('')
  })

  it('includes unit and description in onSubmit when they have values', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-label')).toHaveValue('Pressão arterial')
    })

    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ unit: 'mmHg', description: 'Desc existente' }),
        expect.any(Function),
      )
    })
  })

  it('omits unit and description from onSubmit when cleared', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-form-unit')).toHaveValue('mmHg')
    })

    await userEvent.clear(screen.getByTestId('canonical-field-form-unit'))
    await userEvent.clear(screen.getByTestId('canonical-field-form-description'))
    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.not.objectContaining({ unit: expect.anything() }),
        expect.any(Function),
      )
    })
  })

  it('shows options editor when type is SELECT with prefilled options', async () => {
    const fieldWithOptions: ICanonicalFieldModel = {
      ...existingField,
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    }

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={fieldWithOptions}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-option-value-0')).toHaveValue('low')
  })

  it('includes options in onSubmit when editing SELECT field with options', async () => {
    const onSubmit = jest.fn()
    const fieldWithOptions: ICanonicalFieldModel = {
      ...existingField,
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'low', label: 'Baixo' }],
    }

    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={fieldWithOptions}
        isPending={false}
        onSubmit={onSubmit}
      />,
    )

    await waitFor(() => expect(screen.getByTestId('canonical-field-option-value-0')).toBeInTheDocument())

    await userEvent.click(screen.getByTestId('canonical-field-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ options: [{ value: 'low', label: 'Baixo' }] }),
        expect.any(Function),
      )
    })
  })

  it('shows global error in edit mode when provided', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={false}
        globalError="Erro ao salvar."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('canonical-field-form-error')).toHaveTextContent('Erro ao salvar.')
  })

  it('disables submit button when isPending in edit mode', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        isPending={true}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('canonical-field-form-submit')).toBeDisabled()
  })
})
