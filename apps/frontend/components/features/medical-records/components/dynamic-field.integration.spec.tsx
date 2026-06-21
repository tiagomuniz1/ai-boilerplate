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
  })

  describe('NUMBER', () => {
    it('renders a number input', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.NUMBER })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('type', 'number')
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
  })

  describe('DATE', () => {
    it('renders a date input', () => {
      render(<DynamicField field={makeField({ type: MedicalRecordFieldType.DATE })} value="" onChange={jest.fn()} />)
      expect(screen.getByTestId('dynamic-field-test_key')).toHaveAttribute('type', 'date')
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
  })
})
