jest.mock('@hookform/resolvers/zod', () => {
  const actual = jest.requireActual('@hookform/resolvers/zod')
  return {
    zodResolver:
      (schema: unknown) =>
      async (values: Record<string, unknown>, context: unknown, options: unknown) => {
        const result = await actual.zodResolver(schema)(values, context, options)
        if (values.__notes__ === '__FORCE_NOTES_ERROR__') {
          return { ...result, errors: { ...result.errors, __notes__: { type: 'manual', message: 'Erro forçado' } } }
        }
        if (values.__notes__ === '__FORCE_UNKNOWN_ERROR__') {
          return { ...result, errors: { ...result.errors, __unknown_key__: { type: 'manual', message: 'Erro forçado' } } }
        }
        return result
      },
  }
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalRecordFieldType } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicalRecordForm } from './medical-record-form'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

function makeField(overrides: Partial<IRecordFieldModel> = {}): IRecordFieldModel {
  return {
    key: 'symptom',
    label: 'Sintoma',
    type: MedicalRecordFieldType.TEXT,
    required: false,
    order: 0,
    options: null,
    placeholder: null,
    helpText: null,
    sectionKey: null,
    ...overrides,
  }
}

const defaultProps = {
  schema: [makeField()],
  isPending: false,
  globalError: null,
  onSubmit: jest.fn(),
}

describe('MedicalRecordForm', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders a field for each schema entry', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', label: 'Campo 1', type: MedicalRecordFieldType.TEXT }),
          makeField({ key: 'f2', label: 'Campo 2', type: MedicalRecordFieldType.NUMBER }),
        ]}
      />,
    )
    expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-f2')).toBeInTheDocument()
  })

  it('renders all field types', () => {
    const allTypes = [
      makeField({ key: 'txt', type: MedicalRecordFieldType.TEXT }),
      makeField({ key: 'txa', type: MedicalRecordFieldType.TEXTAREA }),
      makeField({ key: 'num', type: MedicalRecordFieldType.NUMBER }),
      makeField({ key: 'bol', type: MedicalRecordFieldType.BOOLEAN }),
      makeField({ key: 'dat', type: MedicalRecordFieldType.DATE }),
      makeField({ key: 'sel', type: MedicalRecordFieldType.SELECT, options: [{ value: 'a', label: 'A' }] }),
      makeField({ key: 'mul', type: MedicalRecordFieldType.MULTISELECT, options: [{ value: 'x', label: 'X' }] }),
    ]
    renderWithProviders(<MedicalRecordForm {...defaultProps} schema={allTypes} />)

    expect(screen.getByTestId('dynamic-field-txt')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-txa')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-num')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-bol')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-dat')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-sel')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-mul')).toBeInTheDocument()
  })

  it('renders notes textarea in flat layout (no sections)', () => {
    renderWithProviders(<MedicalRecordForm {...defaultProps} />)
    expect(screen.getByTestId('medical-record-notes')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    renderWithProviders(<MedicalRecordForm {...defaultProps} />)
    expect(screen.getByTestId('medical-record-form-submit')).toBeInTheDocument()
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<MedicalRecordForm {...defaultProps} isPending />)
    expect(screen.getByTestId('medical-record-form-submit')).toBeDisabled()
  })

  it('shows globalError alert', () => {
    renderWithProviders(<MedicalRecordForm {...defaultProps} globalError="Esta consulta já possui prontuário" />)
    expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent('Esta consulta já possui prontuário')
  })

  it('validates required text field on submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ required: true })]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates required DATE field on submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'birthday', label: 'Nascimento', type: MedicalRecordFieldType.DATE, required: true })]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates required MULTISELECT field on submit', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({
            key: 'tags',
            label: 'Tags',
            type: MedicalRecordFieldType.MULTISELECT,
            required: true,
            options: [{ value: 'a', label: 'A' }],
          }),
        ]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with coerced data when form is valid', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'symptom', required: true })]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.type(screen.getByTestId('dynamic-field-symptom'), 'Dor de cabeça')
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ symptom: 'Dor de cabeça' })
  })

  it('populates default values', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        defaultData={{ symptom: 'Febre' }}
        defaultNotes="Nota inicial"
      />,
    )
    expect(screen.getByTestId('dynamic-field-symptom')).toHaveValue('Febre')
    expect(screen.getByTestId('medical-record-notes')).toHaveValue('Nota inicial')
  })

  it('calls onSubmit with notes when provided', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(<MedicalRecordForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('medical-record-notes'), 'Observação importante')
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][1]).toBe('Observação importante')
  })

  it('renders flat layout when no sections provided', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'f1' }), makeField({ key: 'f2' })]}
      />,
    )
    expect(screen.queryByTestId('medical-record-form-tabs')).not.toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-f2')).toBeInTheDocument()
    expect(screen.getByTestId('medical-record-notes')).toBeInTheDocument()
  })

  it('renders tabs when sections are provided', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', sectionKey: 'sec_a' }),
          makeField({ key: 'f2', sectionKey: 'sec_b' }),
        ]}
        sections={[
          { key: 'sec_a', title: 'Sinais Vitais', order: 0 },
          { key: 'sec_b', title: 'Histórico', order: 1 },
        ]}
      />,
    )
    expect(screen.getByTestId('medical-record-form-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sec_a')).toBeInTheDocument()
    expect(screen.getByTestId('tab-sec_b')).toBeInTheDocument()
    expect(screen.getByTestId(`tab-${NOTES_TAB}`)).toBeInTheDocument()
  })

  it('shows first section fields by default when sections provided', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', sectionKey: 'sec_a' }),
          makeField({ key: 'f2', sectionKey: 'sec_b' }),
        ]}
        sections={[
          { key: 'sec_a', title: 'Sinais Vitais', order: 0 },
          { key: 'sec_b', title: 'Histórico', order: 1 },
        ]}
      />,
    )
    expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
    expect(screen.queryByTestId('dynamic-field-f2')).not.toBeInTheDocument()
  })

  it('switching tab shows that section fields', async () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', sectionKey: 'sec_a' }),
          makeField({ key: 'f2', sectionKey: 'sec_b' }),
        ]}
        sections={[
          { key: 'sec_a', title: 'Sinais Vitais', order: 0 },
          { key: 'sec_b', title: 'Histórico', order: 1 },
        ]}
      />,
    )
    await userEvent.click(screen.getByTestId('tab-sec_b'))
    expect(screen.queryByTestId('dynamic-field-f1')).not.toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-f2')).toBeInTheDocument()
  })

  it('clicking Notas tab shows notes textarea', async () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'f1', sectionKey: 'sec_a' })]}
        sections={[{ key: 'sec_a', title: 'Anamnese', order: 0 }]}
      />,
    )
    expect(screen.queryByTestId('medical-record-notes')).not.toBeInTheDocument()
    await userEvent.click(screen.getByTestId(`tab-${NOTES_TAB}`))
    expect(screen.getByTestId('medical-record-notes')).toBeInTheDocument()
  })

  it('shows Geral tab when unsectioned fields exist alongside sections', () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', sectionKey: null }),
          makeField({ key: 'f2', sectionKey: 'sec_a' }),
        ]}
        sections={[{ key: 'sec_a', title: 'Anamnese', order: 0 }]}
      />,
    )
    expect(screen.getByTestId(`tab-${GENERAL_TAB}`)).toBeInTheDocument()
    expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
  })

  it('navigates to errored section tab on submit failure', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', label: 'Campo A', required: true, sectionKey: 'sec_a' }),
          makeField({ key: 'f2', label: 'Campo B', sectionKey: 'sec_b' }),
        ]}
        sections={[
          { key: 'sec_a', title: 'Anamnese', order: 0 },
          { key: 'sec_b', title: 'Histórico', order: 1 },
        ]}
        onSubmit={onSubmit}
      />,
    )
    // Navigate to sec_b (f1 — required, empty — is in sec_a)
    await userEvent.click(screen.getByTestId('tab-sec_b'))

    // Submit from sec_b — f1 is required and empty in sec_a
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    // Should auto-navigate back to sec_a (where the validation error is)
    await waitFor(() => {
      expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('dynamic-field-f2')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('renders no fields when switching to a section that has none assigned', async () => {
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'f1', sectionKey: 'sec_a' })]}
        sections={[
          { key: 'sec_a', title: 'Anamnese', order: 0 },
          { key: 'sec_b', title: 'Vazia', order: 1 },
        ]}
      />,
    )

    await userEvent.click(screen.getByTestId('tab-sec_b'))

    expect(screen.queryByTestId('dynamic-field-f1')).not.toBeInTheDocument()
  })

  it('navigates to Notas tab when the notes field has a validation error', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'f1', sectionKey: 'sec_a' })]}
        sections={[{ key: 'sec_a', title: 'Anamnese', order: 0 }]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId(`tab-${NOTES_TAB}`))
    await userEvent.type(screen.getByTestId('medical-record-notes'), '__FORCE_NOTES_ERROR__')
    await userEvent.click(screen.getByTestId('tab-sec_a'))
    expect(screen.queryByTestId('medical-record-notes')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-notes')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('navigates to Geral tab when an unsectioned field has a validation error', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[
          makeField({ key: 'f1', label: 'Campo Geral', required: true, sectionKey: null }),
          makeField({ key: 'f2', label: 'Campo B', sectionKey: 'sec_a' }),
        ]}
        sections={[{ key: 'sec_a', title: 'Anamnese', order: 0 }]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId('tab-sec_a'))
    expect(screen.queryByTestId('dynamic-field-f1')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('dynamic-field-f1')).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not navigate when a validation error key matches no known field', async () => {
    const onSubmit = jest.fn()
    renderWithProviders(
      <MedicalRecordForm
        {...defaultProps}
        schema={[makeField({ key: 'f1', sectionKey: 'sec_a' })]}
        sections={[{ key: 'sec_a', title: 'Anamnese', order: 0 }]}
        onSubmit={onSubmit}
      />,
    )

    await userEvent.click(screen.getByTestId(`tab-${NOTES_TAB}`))
    await userEvent.type(screen.getByTestId('medical-record-notes'), '__FORCE_UNKNOWN_ERROR__')
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
    expect(screen.getByTestId('medical-record-notes')).toBeInTheDocument()
  })
})

// Exported constant for test reference
const NOTES_TAB = '__notes__'
const GENERAL_TAB = '__general__'
