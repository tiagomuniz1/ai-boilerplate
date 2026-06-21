import { MedicalRecordFieldType } from '@app/shared'
import { coerceFieldValue } from './coerce-field-value.mapper'

describe('coerceFieldValue', () => {
  describe('TEXT / TEXTAREA / SELECT', () => {
    it('returns value as-is for text type', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.TEXT, 'hello')).toBe('hello')
    })

    it('returns value as-is for textarea type', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.TEXTAREA, 'long text')).toBe('long text')
    })

    it('returns value as-is for select type', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.SELECT, 'option1')).toBe('option1')
    })
  })

  describe('NUMBER', () => {
    it('converts string number to number', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, '42')).toBe(42)
    })

    it('converts string float to float', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, '3.14')).toBeCloseTo(3.14)
    })

    it('returns original value if not parseable as number', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, 'abc')).toBe('abc')
    })

    it('handles number input directly', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, 7)).toBe(7)
    })
  })

  describe('BOOLEAN', () => {
    it('returns true as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.BOOLEAN, true)).toBe(true)
    })

    it('returns false as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.BOOLEAN, false)).toBe(false)
    })

    it('converts string "true" to true', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.BOOLEAN, 'true')).toBe(true)
    })

    it('converts string "false" to false', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.BOOLEAN, 'false')).toBe(false)
    })

    it('converts other truthy value to true', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.BOOLEAN, 'yes')).toBe(true)
    })
  })

  describe('DATE', () => {
    it('returns string date as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.DATE, '2024-01-15')).toBe('2024-01-15')
    })

    it('converts Date object to ISO date string', () => {
      const d = new Date('2024-01-15T10:30:00Z')
      expect(coerceFieldValue(MedicalRecordFieldType.DATE, d)).toBe('2024-01-15')
    })
  })

  describe('MULTISELECT', () => {
    it('returns array as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.MULTISELECT, ['a', 'b'])).toEqual(['a', 'b'])
    })

    it('wraps single non-empty string in array', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.MULTISELECT, 'item')).toEqual(['item'])
    })

    it('returns empty array for empty array input', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.MULTISELECT, [])).toEqual([])
    })
  })

  describe('null/undefined/empty', () => {
    it('returns null as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, null)).toBeNull()
    })

    it('returns undefined as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, undefined)).toBeUndefined()
    })

    it('returns empty string as-is', () => {
      expect(coerceFieldValue(MedicalRecordFieldType.NUMBER, '')).toBe('')
    })
  })
})
