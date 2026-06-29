'use client'

import { useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useMedications } from '@/components/features/medications/hooks/use-medications.hook'
import type { ICreatePrescriptionInput } from '../types/prescription-input.types'
import type { IApiError } from '@/types/api.types'

const itemSchema = z.object({
  medicationId: z.string().min(1),
  name: z.string(),
  activeIngredient: z.string().nullable(),
  instructions: z.string().min(1, 'Posologia obrigatória').max(1000, 'Máximo 1000 caracteres'),
})

const schema = z.object({
  items: z.array(itemSchema).min(1, 'Adicione ao menos um medicamento'),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
})

type FormValues = z.infer<typeof schema>

export interface PrescriptionFormProps {
  appointmentId: string
  isPending: boolean
  globalError: string | null
  onSubmit: (input: ICreatePrescriptionInput) => void
}

export function PrescriptionForm({ appointmentId, isPending, globalError, onSubmit }: PrescriptionFormProps) {
  const [search, setSearch] = useState('')
  const { data: medicationsPage } = useMedications(search ? { search, limit: 10 } : undefined)

  const { control, register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [], notes: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  function addMedication(med: { id: string; name: string; activeIngredient: string | null }) {
    if (fields.some((f) => f.medicationId === med.id)) return
    append({ medicationId: med.id, name: med.name, activeIngredient: med.activeIngredient, instructions: '' })
    setSearch('')
  }

  function onFormSubmit(values: FormValues) {
    onSubmit({
      appointmentId,
      items: values.items.map((item) => ({
        medicationId: item.medicationId,
        instructions: item.instructions,
      })),
      notes: values.notes || undefined,
    })
  }

  const itemsError = errors.items?.message ?? (errors.items?.root?.message)

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} data-testid="prescription-form" className="flex flex-col gap-5">
      <div>
        <label className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
          Buscar medicamento
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Digite para buscar..."
          className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          data-testid="prescription-form-search"
        />
        {search && medicationsPage && medicationsPage.data.length > 0 && (
          <ul
            className="mt-1 border border-border rounded bg-surface shadow-md max-h-48 overflow-y-auto"
            data-testid="prescription-form-search-results"
          >
            {medicationsPage.data.map((med) => (
              <li key={med.id}>
                <button
                  type="button"
                  onClick={() => addMedication(med)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10"
                  data-testid={`prescription-form-search-result-${med.id}`}
                >
                  <span className="font-medium">{med.name}</span>
                  {med.activeIngredient && (
                    <span className="text-text-mute ml-2">— {med.activeIngredient}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {search && medicationsPage && medicationsPage.data.length === 0 && (
          <p className="mt-1 text-sm text-text-mute" data-testid="prescription-form-no-results">
            Nenhum medicamento encontrado.
          </p>
        )}
      </div>

      {itemsError && (
        <Alert variant="error" data-testid="prescription-form-items-error">
          {itemsError}
        </Alert>
      )}

      {fields.length > 0 && (
        <ul className="flex flex-col gap-4" data-testid="prescription-form-items">
          {fields.map((field, index) => (
            <li key={field.id} className="border border-border rounded p-3 flex flex-col gap-2" data-testid={`prescription-form-item-${index}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium text-sm" data-testid={`prescription-form-item-name-${index}`}>
                    {field.name}
                  </span>
                  {field.activeIngredient && (
                    <span className="text-xs text-text-mute ml-2">{field.activeIngredient}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-danger text-xs hover:underline"
                  data-testid={`prescription-form-item-remove-${index}`}
                >
                  Remover
                </button>
              </div>
              <div>
                <label
                  htmlFor={`item-instructions-${index}`}
                  className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
                >
                  Posologia
                </label>
                <Controller
                  control={control}
                  name={`items.${index}.instructions`}
                  render={({ field: f, fieldState }) => (
                    <>
                      <textarea
                        {...f}
                        id={`item-instructions-${index}`}
                        rows={2}
                        className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="Posologia..."
                        data-testid={`prescription-form-item-instructions-${index}`}
                      />
                      {fieldState.error && (
                        <p role="alert" className="text-danger text-xs mt-0.5">
                          {fieldState.error.message}
                        </p>
                      )}
                    </>
                  )}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label
          htmlFor="prescription-notes"
          className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
        >
          Observações gerais
        </label>
        <textarea
          {...register('notes')}
          id="prescription-notes"
          rows={3}
          className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Observações adicionais (opcional)..."
          data-testid="prescription-form-notes"
        />
        {errors.notes && (
          <p role="alert" className="text-danger text-xs mt-0.5">{errors.notes.message}</p>
        )}
      </div>

      {globalError && (
        <Alert variant="error" data-testid="prescription-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="prescription-form-submit"
        >
          Emitir receita
        </Button>
      </div>
    </form>
  )
}
