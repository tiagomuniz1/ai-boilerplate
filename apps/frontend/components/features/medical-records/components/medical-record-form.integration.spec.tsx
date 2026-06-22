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

  it('renders notes textarea', () => {
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
})
