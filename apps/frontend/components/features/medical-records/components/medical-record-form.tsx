'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicalRecordFieldType } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { DynamicField } from './dynamic-field'
import { coerceFieldValue } from '../mappers/coerce-field-value.mapper'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

interface MedicalRecordFormProps {
  schema: IRecordFieldModel[]
  defaultData?: Record<string, unknown>
  defaultNotes?: string
  isPending: boolean
  globalError?: string | null
  onSubmit: (data: Record<string, unknown>, notes?: string) => void
}

function buildZodSchema(fields: IRecordFieldModel[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields) {
    let fieldSchema: z.ZodTypeAny

    switch (field.type) {
      case MedicalRecordFieldType.NUMBER:
        fieldSchema = z.string().or(z.number())
        break
      case MedicalRecordFieldType.BOOLEAN:
        fieldSchema = z.boolean()
        break
      case MedicalRecordFieldType.MULTISELECT:
        fieldSchema = z.array(z.string())
        break
      default:
        fieldSchema = z.string()
    }

    if (field.required) {
      if (
        field.type === MedicalRecordFieldType.TEXT ||
        field.type === MedicalRecordFieldType.TEXTAREA ||
        field.type === MedicalRecordFieldType.SELECT ||
        field.type === MedicalRecordFieldType.DATE
      ) {
        fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} é obrigatório`)
      }
      if (field.type === MedicalRecordFieldType.MULTISELECT) {
        fieldSchema = (fieldSchema as z.ZodArray<z.ZodString>).min(1, `${field.label} é obrigatório`)
      }
    } else {
      fieldSchema = fieldSchema.optional()
    }

    shape[field.key] = fieldSchema
  }
  shape.__notes__ = z.string().optional()
  return z.object(shape)
}

type FormValues = Record<string, unknown>

export function MedicalRecordForm({
  schema,
  defaultData = {},
  defaultNotes,
  isPending,
  globalError,
  onSubmit,
}: MedicalRecordFormProps) {
  const zodSchema = buildZodSchema(schema)

  const defaultValues: FormValues = { __notes__: defaultNotes ?? '' }
  for (const field of schema) {
    const raw = defaultData[field.key]
    defaultValues[field.key] =
      raw !== undefined
        ? raw
        : field.type === MedicalRecordFieldType.BOOLEAN
          ? false
          : field.type === MedicalRecordFieldType.MULTISELECT
            ? []
            : ''
  }

  const { handleSubmit, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(zodSchema),
    defaultValues,
  })

  function onFormSubmit(values: FormValues) {
    const data: Record<string, unknown> = {}
    for (const field of schema) {
      const raw = values[field.key]
      if (raw !== undefined && raw !== '' && raw !== null) {
        data[field.key] = coerceFieldValue(field.type, raw)
      /* c8 ignore next 5 */
      } else if (field.type === MedicalRecordFieldType.BOOLEAN) {
        data[field.key] = coerceFieldValue(field.type, raw)
      } else if (field.type === MedicalRecordFieldType.MULTISELECT) {
        data[field.key] = coerceFieldValue(field.type, raw) ?? []
      }
    }
    const notes = (values.__notes__ as string) || undefined
    onSubmit(data, notes)
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      data-testid="medical-record-form"
      className="space-y-4"
    >
      {schema.map((field) => (
        <Controller
          key={field.key}
          name={field.key}
          control={control}
          render={({ field: rhfField }) => (
            <DynamicField
              field={field}
              value={rhfField.value}
              onChange={rhfField.onChange}
              error={errors[field.key]?.message as string | undefined}
            />
          )}
        />
      ))}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="field-notes" className="text-sm font-medium text-text">
          Observações
        </label>
        <Controller
          name="__notes__"
          control={control}
          render={({ field: rhfField }) => (
            <textarea
              id="field-notes"
              value={
                /* c8 ignore next */
                (rhfField.value as string) ?? ''
              }
              onChange={rhfField.onChange}
              rows={3}
              placeholder="Observações adicionais..."
              data-testid="medical-record-notes"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        />
      </div>

      {globalError && (
        <Alert variant="error" data-testid="medical-record-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="medical-record-form-submit"
        >
          Salvar prontuário
        </Button>
      </div>
    </form>
  )
}
