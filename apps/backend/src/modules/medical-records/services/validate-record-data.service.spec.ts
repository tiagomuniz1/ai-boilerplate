import { UnprocessableEntityException } from '@nestjs/common'
import { MedicalRecordFieldType } from '@app/shared'
import { MedicalRecordTemplateField } from '../../medical-record-templates/entities/medical-record-template.entity'
import { ValidateRecordDataService } from './validate-record-data.service'

const makeField = (overrides: Partial<MedicalRecordTemplateField>): MedicalRecordTemplateField => ({
  key: 'field_key',
  label: 'Field Label',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  canonical: false,
  canonicalKey: null,
  ...overrides,
})

describe('ValidateRecordDataService', () => {
  let service: ValidateRecordDataService

  beforeEach(() => {
    service = new ValidateRecordDataService()
  })

  it('passes with empty data and no required fields', () => {
    expect(() => service.validate({}, [makeField({ required: false })])).not.toThrow()
  })

  it('passes with all required fields filled', () => {
    const snapshot = [makeField({ key: 'name', type: MedicalRecordFieldType.TEXT, required: true })]
    expect(() => service.validate({ name: 'Alice' }, snapshot)).not.toThrow()
  })

  it('throws 422 for missing required field', () => {
    const snapshot = [makeField({ key: 'name', required: true })]
    expect(() => service.validate({}, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('throws 422 for unknown field key', () => {
    const snapshot = [makeField({ key: 'known' })]
    expect(() => service.validate({ unknown: 'value' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes number type with numeric value', () => {
    const snapshot = [makeField({ key: 'age', type: MedicalRecordFieldType.NUMBER })]
    expect(() => service.validate({ age: 30 }, snapshot)).not.toThrow()
  })

  it('throws 422 for non-number value in NUMBER field', () => {
    const snapshot = [makeField({ key: 'age', type: MedicalRecordFieldType.NUMBER })]
    expect(() => service.validate({ age: 'thirty' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes boolean type with boolean value', () => {
    const snapshot = [makeField({ key: 'smoker', type: MedicalRecordFieldType.BOOLEAN })]
    expect(() => service.validate({ smoker: true }, snapshot)).not.toThrow()
  })

  it('throws 422 for non-boolean value in BOOLEAN field', () => {
    const snapshot = [makeField({ key: 'smoker', type: MedicalRecordFieldType.BOOLEAN })]
    expect(() => service.validate({ smoker: 'yes' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes date type with valid date string', () => {
    const snapshot = [makeField({ key: 'dob', type: MedicalRecordFieldType.DATE })]
    expect(() => service.validate({ dob: '2000-01-01' }, snapshot)).not.toThrow()
  })

  it('throws 422 for invalid date string in DATE field', () => {
    const snapshot = [makeField({ key: 'dob', type: MedicalRecordFieldType.DATE })]
    expect(() => service.validate({ dob: 'not-a-date' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('throws 422 for non-string value in DATE field', () => {
    const snapshot = [makeField({ key: 'dob', type: MedicalRecordFieldType.DATE })]
    expect(() => service.validate({ dob: 123 }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes text type with string value', () => {
    const snapshot = [makeField({ key: 'notes', type: MedicalRecordFieldType.TEXT })]
    expect(() => service.validate({ notes: 'some text' }, snapshot)).not.toThrow()
  })

  it('throws 422 for non-string value in TEXT field', () => {
    const snapshot = [makeField({ key: 'notes', type: MedicalRecordFieldType.TEXT })]
    expect(() => service.validate({ notes: 42 }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes textarea type with string value', () => {
    const snapshot = [makeField({ key: 'obs', type: MedicalRecordFieldType.TEXTAREA })]
    expect(() => service.validate({ obs: 'long text' }, snapshot)).not.toThrow()
  })

  it('throws 422 for non-string value in TEXTAREA field', () => {
    const snapshot = [makeField({ key: 'obs', type: MedicalRecordFieldType.TEXTAREA })]
    expect(() => service.validate({ obs: {} }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes select type with valid option value', () => {
    const snapshot = [
      makeField({
        key: 'risk',
        type: MedicalRecordFieldType.SELECT,
        options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }],
      }),
    ]
    expect(() => service.validate({ risk: 'low' }, snapshot)).not.toThrow()
  })

  it('throws 422 for invalid select value', () => {
    const snapshot = [
      makeField({
        key: 'risk',
        type: MedicalRecordFieldType.SELECT,
        options: [{ value: 'low', label: 'Low' }],
      }),
    ]
    expect(() => service.validate({ risk: 'extreme' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes select type when options is null and value is not provided', () => {
    const snapshot = [
      makeField({ key: 'risk', type: MedicalRecordFieldType.SELECT, options: null }),
    ]
    expect(() => service.validate({}, snapshot)).not.toThrow()
  })

  it('throws 422 for select field with value when options is null', () => {
    const snapshot = [
      makeField({ key: 'risk', type: MedicalRecordFieldType.SELECT, options: null }),
    ]
    expect(() => service.validate({ risk: 'anything' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('throws 422 for multiselect field with value when options is null', () => {
    const snapshot = [
      makeField({ key: 'tags', type: MedicalRecordFieldType.MULTISELECT, options: null }),
    ]
    expect(() => service.validate({ tags: ['x'] }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('passes multiselect type with valid array of option values', () => {
    const snapshot = [
      makeField({
        key: 'tags',
        type: MedicalRecordFieldType.MULTISELECT,
        options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
      }),
    ]
    expect(() => service.validate({ tags: ['a', 'b'] }, snapshot)).not.toThrow()
  })

  it('throws 422 when multiselect value is not an array', () => {
    const snapshot = [
      makeField({
        key: 'tags',
        type: MedicalRecordFieldType.MULTISELECT,
        options: [{ value: 'a', label: 'A' }],
      }),
    ]
    expect(() => service.validate({ tags: 'a' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('throws 422 when multiselect contains invalid option value', () => {
    const snapshot = [
      makeField({
        key: 'tags',
        type: MedicalRecordFieldType.MULTISELECT,
        options: [{ value: 'a', label: 'A' }],
      }),
    ]
    expect(() => service.validate({ tags: ['a', 'invalid'] }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('skips type check for optional empty field', () => {
    const snapshot = [makeField({ key: 'age', type: MedicalRecordFieldType.NUMBER, required: false })]
    expect(() => service.validate({ age: null }, snapshot)).not.toThrow()
    expect(() => service.validate({}, snapshot)).not.toThrow()
    expect(() => service.validate({ age: '' }, snapshot)).not.toThrow()
  })

  it('throws 422 for required field with empty string value', () => {
    const snapshot = [makeField({ key: 'name', type: MedicalRecordFieldType.TEXT, required: true })]
    expect(() => service.validate({ name: '' }, snapshot)).toThrow(UnprocessableEntityException)
  })

  it('throws 422 for required field with null value', () => {
    const snapshot = [makeField({ key: 'name', type: MedicalRecordFieldType.TEXT, required: true })]
    expect(() => service.validate({ name: null }, snapshot)).toThrow(UnprocessableEntityException)
  })
})
