import { Injectable, UnprocessableEntityException } from '@nestjs/common'
import { MedicalRecordFieldType } from '@app/shared'
import { MedicalRecordTemplateField } from '../../medical-record-templates/entities/medical-record-template.entity'

@Injectable()
export class ValidateRecordDataService {
  validate(data: Record<string, unknown>, snapshot: MedicalRecordTemplateField[]): void {
    const snapshotKeys = new Set(snapshot.map((f) => f.key))

    for (const key of Object.keys(data)) {
      if (!snapshotKeys.has(key)) {
        throw new UnprocessableEntityException(`Unknown field key: "${key}"`)
      }
    }

    for (const field of snapshot) {
      const value = data[field.key]
      const isEmpty = value === undefined || value === null || value === ''

      if (field.required && isEmpty) {
        throw new UnprocessableEntityException(`Field "${field.key}" is required`)
      }

      if (isEmpty) continue

      switch (field.type) {
        case MedicalRecordFieldType.NUMBER:
          if (typeof value !== 'number') {
            throw new UnprocessableEntityException(`Field "${field.key}" must be a number`)
          }
          break

        case MedicalRecordFieldType.BOOLEAN:
          if (typeof value !== 'boolean') {
            throw new UnprocessableEntityException(`Field "${field.key}" must be a boolean`)
          }
          break

        case MedicalRecordFieldType.DATE:
          if (typeof value !== 'string' || isNaN(Date.parse(value))) {
            throw new UnprocessableEntityException(`Field "${field.key}" must be a valid date string`)
          }
          break

        case MedicalRecordFieldType.TEXT:
        case MedicalRecordFieldType.TEXTAREA:
          if (typeof value !== 'string') {
            throw new UnprocessableEntityException(`Field "${field.key}" must be a string`)
          }
          break

        case MedicalRecordFieldType.SELECT: {
          const allowed = (field.options ?? []).map((o) => o.value)
          if (!allowed.includes(value as string)) {
            throw new UnprocessableEntityException(`Field "${field.key}" has invalid option value`)
          }
          break
        }

        case MedicalRecordFieldType.MULTISELECT: {
          if (!Array.isArray(value)) {
            throw new UnprocessableEntityException(`Field "${field.key}" must be an array`)
          }
          const allowed = (field.options ?? []).map((o) => o.value)
          for (const v of value as unknown[]) {
            if (!allowed.includes(v as string)) {
              throw new UnprocessableEntityException(`Field "${field.key}" has invalid option value`)
            }
          }
          break
        }
      }
    }
  }
}
