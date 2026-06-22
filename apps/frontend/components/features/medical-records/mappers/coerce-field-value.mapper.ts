import { MedicalRecordFieldType } from '@app/shared'

export function coerceFieldValue(type: MedicalRecordFieldType, value: unknown): unknown {
  if (value === undefined || value === null || value === '') return value

  switch (type) {
    case MedicalRecordFieldType.NUMBER: {
      const num = Number(value)
      return isNaN(num) ? value : num
    }
    case MedicalRecordFieldType.BOOLEAN:
      if (typeof value === 'boolean') return value
      if (value === 'true') return true
      if (value === 'false') return false
      return Boolean(value)
    case MedicalRecordFieldType.DATE:
      if (value instanceof Date) return value.toISOString().split('T')[0]
      return value
    case MedicalRecordFieldType.MULTISELECT:
      if (Array.isArray(value)) return value
      /* c8 ignore next */
      if (typeof value === 'string') return value ? [value] : []
      return []
    default:
      return value
  }
}
