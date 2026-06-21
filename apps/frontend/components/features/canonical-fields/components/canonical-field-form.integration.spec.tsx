jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'backoffice') }))

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
  specialtyId: null,
  description: 'Desc existente',
  isActive: true,
}

const specialties = [{ id: 'spec-uuid', name: 'Cardiologia' }]

describe('CanonicalFieldForm (integration) — create mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders all fields', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
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
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={onSubmit} />,
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
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
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
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
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
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.SELECT)

    expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
  })

  it('shows options editor when type is MULTISELECT', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.MULTISELECT)

    expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
  })

  it('hides options editor when type is not SELECT/MULTISELECT', async () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" specialties={[]} isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.selectOptions(screen.getByTestId('canonical-field-form-type'), MedicalRecordFieldType.TEXT)

    expect(screen.queryByTestId('canonical-field-options-editor')).not.toBeInTheDocument()
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="create"
        specialties={[]}
        isPending={false}
        globalError="Chave já cadastrada."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('canonical-field-form-error')).toHaveTextContent('Chave já cadastrada.')
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" specialties={[]} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('canonical-field-form-submit')).toBeDisabled()
  })

  it('renders specialty options', () => {
    renderWithProviders(
      <CanonicalFieldForm mode="create" specialties={specialties} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByRole('option', { name: 'Cardiologia' })).toBeInTheDocument()
  })
})

describe('CanonicalFieldForm (integration) — edit mode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows canonicalKey as readonly', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        specialties={[]}
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
        specialties={[]}
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
        specialties={[]}
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
        specialties={[]}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-options-editor')).toBeInTheDocument()
    })

    expect(screen.getByTestId('canonical-field-option-value-0')).toHaveValue('low')
  })

  it('shows global error in edit mode when provided', async () => {
    renderWithProviders(
      <CanonicalFieldForm
        mode="edit"
        defaultValues={existingField}
        specialties={[]}
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
        specialties={[]}
        isPending={true}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('canonical-field-form-submit')).toBeDisabled()
  })
})
