import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalRecordFieldType } from '@app/shared'
import { DynamicField } from './dynamic-field'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

function makeField(overrides: Partial<IRecordFieldModel> = {}): IRecordFieldModel {
  return {
    key: 'test_key',
    label: 'Campo Teste',
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

describe('DynamicField', () => {
  describe('TEXT', () => {
    it('renders a text input', () => {
      render(<DynamicField field={makeField()} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toBeInTheDocument()
      expect(screen.getByTestId('dynamic-field-test_key').tagName).toBe('INPUT')
    })

    it('falls back to empty string when value is null', () => {
      render(<DynamicField field={makeField()} value={null} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveValue('')
    })

    it('shows label', () => {
      render(<DynamicField field={makeField()} value="" onChange={jest.fn()} />)
      expect(screen.getByText('Campo Teste')).toBeInTheDocument()
    })

    it('calls onChange with input value', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={makeField()} value="" onChange={onChange} />)
      await userEvent.type(screen.getByTestId('dynamic-field-test_key'), 'hello')
      expect(onChange).toHaveBeenCalled()
    })

    it('shows error message', () => {
      render(<DynamicField field={makeField()} value="" onChange={jest.fn()} error="Campo obrigatório" />)
      expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
    })

    it('shows helpText', () => {
      render(<DynamicField field={makeField({ helpText: 'Dica útil' })} value="" onChange={jest.fn()} />)
      expect(screen.getByText('Dica útil')).toBeInTheDocument()
    })

    it('shows placeholder', () => {
      render(<DynamicField field={makeField({ placeholder: 'Ex: sintoma' })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('placeholder', 'Ex: sintoma')
    })

    it('is disabled when disabled prop is true', () => {
      render(<DynamicField field={makeField()} value="" onChange={jest.fn()} disabled />)
      expect(screen.getByTestId('dynamic-field-test_key')).toBeDisabled()
    })
  })

  describe('TEXTAREA', () => {
    it('renders a textarea', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.TEXTAREA })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key').tagName).toBe('TEXTAREA')
    })

    it('falls back to empty string when value is null', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.TEXTAREA })} value={null} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveValue('')
    })

    it('calls onChange with textarea value', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.TEXTAREA })} value="" onChange={onChange} />)
      await userEvent.type(screen.getByTestId('dynamic-field-test_key'), 'hello')
      expect(onChange).toHaveBeenCalled()
    })

    it('shows placeholder for textarea', () => {
      render(
        <DynamicField
          field={makeField({ type: MedicalRecordFieldType.TEXTAREA, placeholder: 'Digite aqui' })}
          value=""
          onChange={jest.fn()}
        />,
      )
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('placeholder', 'Digite aqui')
    })
  })

  describe('NUMBER', () => {
    it('renders a number input', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.NUMBER })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('type', 'number')
    })

    it('falls back to empty string when value is null', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.NUMBER })} value={null} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveValue(null)
    })

    it('calls onChange with number value', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.NUMBER })} value="" onChange={onChange} />)
      await userEvent.type(screen.getByTestId('dynamic-field-test_key'), '5')
      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('BOOLEAN', () => {
    it('renders a checkbox', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.BOOLEAN })} value={false} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('type', 'checkbox')
    })

    it('calls onChange with boolean on check', () => {
      const onChange = jest.fn()
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.BOOLEAN })} value={false} onChange={onChange} />)
      fireEvent.click(screen.getByTestId('dynamic-field-test_key'))
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('is checked when value is true', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.BOOLEAN })} value={true} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toBeChecked()
    })

    it('shows helpText and error for boolean field', () => {
      render(
        <DynamicField
          field={makeField({ type: MedicalRecordFieldType.BOOLEAN, helpText: 'Marque se aplicável' })}
          value={false}
          onChange={jest.fn()}
          error="Campo obrigatório"
        />,
      )
      expect(screen.getByText('Marque se aplicável')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório')
    })
  })

  describe('DATE', () => {
    it('renders a date input', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.DATE })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('type', 'date')
    })

    it('falls back to empty string when value is null', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.DATE })} value={null} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveValue('')
    })

    it('calls onChange with date value', () => {
      const onChange = jest.fn()
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.DATE })} value="" onChange={onChange} />)
      fireEvent.change(screen.getByTestId('dynamic-field-test_key'), { target: { value: '2024-01-01' } })
      expect(onChange).toHaveBeenCalledWith('2024-01-01')
    })
  })

  describe('SELECT', () => {
    const selectField = makeField({
      type: MedicalRecordFieldType.SELECT,
      options: [
        { value: 'opt1', label: 'Opção 1' },
        { value: 'opt2', label: 'Opção 2' },
      ],
    })

    it('falls back to empty string when value is null', () => {
      render(<DynamicField field={selectField} value={null} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveValue('')
    })

    it('renders a select with options', () => {
      render(<DynamicField field={selectField} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key').tagName).toBe('SELECT')
      expect(screen.getByText('Opção 1')).toBeInTheDocument()
      expect(screen.getByText('Opção 2')).toBeInTheDocument()
    })

    it('calls onChange with selected value', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={selectField} value="" onChange={onChange} />)
      await userEvent.selectOptions(screen.getByTestId('dynamic-field-test_key'), 'opt1')
      expect(onChange).toHaveBeenCalledWith('opt1')
    })

    it('renders select without options when options is null', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.SELECT, options: null })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key').tagName).toBe('SELECT')
      expect(screen.getByText('Selecione...')).toBeInTheDocument()
    })
  })

  describe('MULTISELECT', () => {
    const multiselectField = makeField({
      type: MedicalRecordFieldType.MULTISELECT,
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    })

    it('renders checkboxes for each option', () => {
      render(<DynamicField field={multiselectField} value={[]} onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key-option-a')).toBeInTheDocument()
      expect(screen.getByTestId('dynamic-field-test_key-option-b')).toBeInTheDocument()
    })

    it('calls onChange with array of selected values', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={multiselectField} value={[]} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('dynamic-field-test_key-option-a'))
      expect(onChange).toHaveBeenCalledWith(['a'])
    })

    it('removes value from array when unchecked', async () => {
      const onChange = jest.fn()
      render(<DynamicField field={multiselectField} value={['a', 'b']} onChange={onChange} />)
      await userEvent.click(screen.getByTestId('dynamic-field-test_key-option-a'))
      expect(onChange).toHaveBeenCalledWith(['b'])
    })

    it('treats non-array value as empty selection', () => {
      render(<DynamicField field={multiselectField} value="not_an_array" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key-option-a')).not.toBeChecked()
      expect(screen.getByTestId('dynamic-field-test_key-option-b')).not.toBeChecked()
    })
  })

  describe('unknown type', () => {
    it('renders nothing for unknown field type', () => {
      render(
        <DynamicField
          field={makeField({ type: 'unknown_type' as MedicalRecordFieldType })}
          value=""
          onChange={jest.fn()}
        />,
      )
      expect(screen.queryByTestId('dynamic-field-test_key')).not.toBeInTheDocument()
    })
  })
})
