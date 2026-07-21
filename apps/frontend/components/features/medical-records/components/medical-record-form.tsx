'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MedicalRecordFieldType } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Tabs } from '@/components/ui/atoms/tabs/tabs'
import { DynamicField } from './dynamic-field'
import { coerceFieldValue } from '../mappers/coerce-field-value.mapper'
import type { IRecordFieldModel } from '../types/medical-record-model.types'

interface IFormSection {
  key: string
  title: string
  order: number
}

interface MedicalRecordFormProps {
  schema: IRecordFieldModel[]
  sections?: IFormSection[]
  defaultData?: Record<string, unknown>
  defaultNotes?: string
  isPending: boolean
  globalError?: string | null
  onSubmit: (data: Record<string, unknown>, notes?: string) => void
}

const NOTES_TAB = '__notes__'
const GENERAL_TAB = '__general__'

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
  sections = [],
  defaultData = {},
  defaultNotes,
  isPending,
  globalError,
  onSubmit,
}: MedicalRecordFormProps) {
  const sortedSections = sections.slice().sort((a, b) => a.order - b.order)
  const hasSections = sortedSections.length > 0

  const fieldsBySection = new Map<string | null, IRecordFieldModel[]>()
  for (const field of schema) {
    const key = field.sectionKey ?? null
    if (!fieldsBySection.has(key)) fieldsBySection.set(key, [])
    fieldsBySection.get(key)!.push(field)
  }
  const unsectionedFields = fieldsBySection.get(null) ?? []

  // sortedSections[0] is guaranteed to exist here since hasSections requires length > 0.
  const firstTab = hasSections
    ? (unsectionedFields.length > 0 ? GENERAL_TAB : sortedSections[0]!.key)
    : 'all'
  const [activeSectionKey, setActiveSectionKey] = useState<string>(firstTab)

  const tabItems = hasSections
    ? [
        ...(unsectionedFields.length > 0 ? [{ id: GENERAL_TAB, label: 'Geral' }] : []),
        ...sortedSections.map((s) => ({ id: s.key, label: s.title })),
        { id: NOTES_TAB, label: 'Notas' },
      ]
    : []

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

  function onFormError(formErrors: Record<string, unknown>) {
    if (!hasSections) return
    const errorKeys = Object.keys(formErrors)
    for (const key of errorKeys) {
      if (key === '__notes__') {
        setActiveSectionKey(NOTES_TAB)
        return
      }
      const field = schema.find((f) => f.key === key)
      if (!field) continue
      setActiveSectionKey(field.sectionKey ?? GENERAL_TAB)
      return
    }
  }

  function renderField(field: IRecordFieldModel) {
    return (
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
    )
  }

  function renderNotesField() {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor="field-notes" className="text-sm font-medium text-text">
          Notas do profissional
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
              rows={4}
              placeholder="Observações adicionais..."
              data-testid="medical-record-notes"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          )}
        />
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit, onFormError)}
      data-testid="medical-record-form"
      className="flex flex-col gap-4"
    >
      {hasSections ? (
        <>
          <Tabs
            items={tabItems}
            activeId={activeSectionKey}
            onChange={setActiveSectionKey}
            data-testid="medical-record-form-tabs"
          />
          <div className="space-y-3 min-h-[120px]">
            {activeSectionKey === NOTES_TAB && renderNotesField()}
            {activeSectionKey === GENERAL_TAB && unsectionedFields.map(renderField)}
            {activeSectionKey !== NOTES_TAB && activeSectionKey !== GENERAL_TAB &&
              (fieldsBySection.get(activeSectionKey) ?? []).map(renderField)}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-3">
            {unsectionedFields.map(renderField)}
          </div>
          {renderNotesField()}
        </>
      )}

      {globalError && (
        <Alert variant="error" data-testid="medical-record-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex justify-end pt-2 border-t border-border">
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
