jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CanonicalFieldOptionsEditor } from './canonical-field-options-editor'

function OptionsEditorWrapper({ defaultOptions = [] }: { defaultOptions?: { value: string; label: string }[] }) {
  const { control, formState: { errors } } = useForm({
    defaultValues: { options: defaultOptions },
  })
  // O componente recebe Control<any>; um Control<T> concreto não é atribuível a
  // ele por contravariância em ValidateForm<T> — limitação de tipos do
  // react-hook-form, não do componente.
  return <CanonicalFieldOptionsEditor control={control as unknown as Control<any>} errors={errors} />
}

const validatedOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        value: z.string().min(1, 'Valor obrigatório'),
        label: z.string().min(1, 'Rótulo obrigatório'),
      }),
    )
    .min(1, 'Adicione ao menos uma opção'),
})

function OptionsEditorWrapperWithValidation() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validatedOptionsSchema),
    defaultValues: { options: [] },
  })
  return (
    <form onSubmit={handleSubmit(() => {})} data-testid="test-form">
      <CanonicalFieldOptionsEditor control={control as unknown as Control<any>} errors={errors} />
      <button type="submit" data-testid="test-submit">
        Submit
      </button>
    </form>
  )
}

describe('CanonicalFieldOptionsEditor (integration)', () => {
  it('renders empty state when no options', () => {
    renderWithProviders(<OptionsEditorWrapper />)
    expect(screen.getByTestId('canonical-field-options-empty')).toBeInTheDocument()
  })

  it('renders option rows when options exist', () => {
    renderWithProviders(
      <OptionsEditorWrapper defaultOptions={[{ value: 'low', label: 'Baixo' }]} />,
    )
    expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('canonical-field-option-value-0')).toHaveValue('low')
    expect(screen.getByTestId('canonical-field-option-label-0')).toHaveValue('Baixo')
  })

  it('adds a new empty option row when "Adicionar opção" is clicked', async () => {
    renderWithProviders(<OptionsEditorWrapper />)

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('canonical-field-options-empty')).not.toBeInTheDocument()
  })

  it('removes an option row when remove button is clicked', async () => {
    renderWithProviders(
      <OptionsEditorWrapper
        defaultOptions={[
          { value: 'low', label: 'Baixo' },
          { value: 'high', label: 'Alto' },
        ]}
      />,
    )

    expect(screen.getByTestId('canonical-field-option-row-1')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('canonical-field-option-remove-0'))

    await waitFor(() => {
      expect(screen.queryByTestId('canonical-field-option-row-1')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument()
  })

  it('renders add option button', () => {
    renderWithProviders(<OptionsEditorWrapper />)
    expect(screen.getByTestId('canonical-field-options-add')).toBeInTheDocument()
  })

  it('shows global options error when submitted with no options', async () => {
    renderWithProviders(<OptionsEditorWrapperWithValidation />)

    await userEvent.click(screen.getByTestId('test-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-options-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('canonical-field-options-error')).toHaveTextContent(
      'Adicione ao menos uma opção',
    )
  })

  it('shows per-field value error when option value is empty', async () => {
    renderWithProviders(<OptionsEditorWrapperWithValidation />)

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))
    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByTestId('canonical-field-option-label-0'), 'Opção A')
    await userEvent.click(screen.getByTestId('test-submit'))

    await waitFor(() => {
      expect(screen.getByText('Valor obrigatório')).toBeInTheDocument()
    })
  })

  it('shows per-field label error when option label is empty', async () => {
    renderWithProviders(<OptionsEditorWrapperWithValidation />)

    await userEvent.click(screen.getByTestId('canonical-field-options-add'))
    await waitFor(() => {
      expect(screen.getByTestId('canonical-field-option-row-0')).toBeInTheDocument()
    })

    await userEvent.type(screen.getByTestId('canonical-field-option-value-0'), 'opt_a')
    await userEvent.click(screen.getByTestId('test-submit'))

    await waitFor(() => {
      expect(screen.getByText('Rótulo obrigatório')).toBeInTheDocument()
    })
  })
})
