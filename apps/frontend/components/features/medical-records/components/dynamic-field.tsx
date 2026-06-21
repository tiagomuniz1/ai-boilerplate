'use client'

import { MedicalRecordFieldType } from '@app/shared'
import { FormField } from '@/components/ui/molecules/form-field/form-field'
import { Input } from '@/components/ui/atoms/input/input'
import { cn } from '@/lib/cn'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

interface DynamicFieldProps {
  field: IRecordFieldModel
  value: unknown
  onChange: (value: unknown) => void
  error?: string
  disabled?: boolean
}

export function DynamicField({ field, value, onChange, error, disabled }: DynamicFieldProps) {
  const fieldId = `field-${field.key}`

  function renderInput() {
    switch (field.type) {
      case MedicalRecordFieldType.TEXT:
        return (
          <Input
            id={fieldId}
            type="text"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            data-testid={`dynamic-field-${field.key}`}
          />
        )

      case MedicalRecordFieldType.TEXTAREA:
        return (
          <textarea
            id={fieldId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            rows={4}
            data-testid={`dynamic-field-${field.key}`}
            className={cn(
              'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text',
              'placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        )

      case MedicalRecordFieldType.NUMBER:
        return (
          <Input
            id={fieldId}
            type="number"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            data-testid={`dynamic-field-${field.key}`}
          />
        )

      case MedicalRecordFieldType.BOOLEAN:
        return (
          <div className="flex items-center gap-2">
            <input
              id={fieldId}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              disabled={disabled}
              data-testid={`dynamic-field-${field.key}`}
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
            />
            <label htmlFor={fieldId} className="text-sm text-text">
              {field.label}
            </label>
          </div>
        )

      case MedicalRecordFieldType.DATE:
        return (
          <Input
            id={fieldId}
            type="date"
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            data-testid={`dynamic-field-${field.key}`}
          />
        )

      case MedicalRecordFieldType.SELECT:
        return (
          <select
            id={fieldId}
            value={(value as string) ?? ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            data-testid={`dynamic-field-${field.key}`}
            className={cn(
              'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text',
              'focus:outline-none focus:ring-2 focus:ring-primary/40',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case MedicalRecordFieldType.MULTISELECT: {
        const selectedValues = Array.isArray(value) ? (value as string[]) : []
        return (
          <div
            className="space-y-1"
            data-testid={`dynamic-field-${field.key}`}
          >
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={selectedValues.includes(opt.value)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...selectedValues, opt.value]
                      : selectedValues.filter((v) => v !== opt.value)
                    onChange(next)
                  }}
                  disabled={disabled}
                  data-testid={`dynamic-field-${field.key}-option-${opt.value}`}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )
      }

      default:
        return null
    }
  }

  if (field.type === MedicalRecordFieldType.BOOLEAN) {
    return (
      <div className="flex flex-col gap-1">
        {renderInput()}
        {field.helpText && (
          <span className="text-xs text-text/50">{field.helpText}</span>
        )}
        {error && (
          <span role="alert" className="text-xs text-danger">
            {error}
          </span>
        )}
      </div>
    )
  }

  return (
    <FormField
      label={field.label}
      htmlFor={fieldId}
      required={field.required}
      error={error}
    >
      {renderInput()}
      {field.helpText && (
        <span className="text-xs text-text/50">{field.helpText}</span>
      )}
    </FormField>
  )
}
