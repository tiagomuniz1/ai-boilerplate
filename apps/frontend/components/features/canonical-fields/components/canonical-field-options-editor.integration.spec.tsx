jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { CanonicalFieldOptionsEditor } from './canonical-field-options-editor'

function OptionsEditorWrapper({ defaultOptions = [] }: { defaultOptions?: { value: string; label: string }[] }) {
  const { control, formState: { errors } } = useForm({
    defaultValues: { options: defaultOptions },
  })
  return <CanonicalFieldOptionsEditor control={control} errors={errors} />
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
})
