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
  medicationId: z.string(),
  name: z.string(),
  activeIngredient: z.string().nullable(),
  dosage: z.string().max(100, 'Máximo 100 caracteres').optional(),
  quantity: z.string().max(100, 'Máximo 100 caracteres').optional(),
  instructions: z.string().min(1, 'Posologia obrigatória').max(1000, 'Máximo 1000 caracteres'),
  isManual: z.boolean(),
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
  const [inputMode, setInputMode] = useState<'medication' | 'ingredient'>('medication')
  const [manualText, setManualText] = useState('')

  const { data: medicationsPage } = useMedications(
    inputMode === 'medication' && search ? { search, limit: 10 } : undefined,
  )

  const { control, register, handleSubmit, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [], notes: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  function addMedication(med: { id: string; name: string; activeIngredient: string | null }) {
    if (fields.some((f) => f.medicationId === med.id)) return
    append({ medicationId: med.id, name: med.name, activeIngredient: med.activeIngredient, dosage: '', quantity: '', instructions: '', isManual: false })
    setSearch('')
  }

  function addManualIngredient() {
    const name = manualText.trim()
    if (!name) return
    append({
      medicationId: '',
      name,
      activeIngredient: name,
      dosage: '',
      quantity: '',
      instructions: '',
      isManual: true,
    })
    setManualText('')
  }

  function onFormSubmit(values: FormValues) {
    onSubmit({
      appointmentId,
      items: values.items.map((item) => ({
        ...(item.isManual
          ? { activeIngredientName: item.name }
          : { medicationId: item.medicationId }
        ),
        ...(item.dosage ? { dosage: item.dosage } : {}),
        ...(item.quantity ? { quantity: item.quantity } : {}),
        instructions: item.instructions,
      })),
      notes: values.notes || undefined,
    })
  }

  const itemsError = errors.items?.message ?? (errors.items?.root?.message)

  const showMedResults = inputMode === 'medication' && search && medicationsPage && medicationsPage.data.length > 0
  const showMedNoResults = inputMode === 'medication' && search && medicationsPage && medicationsPage.data.length === 0

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} data-testid="prescription-form" className="flex flex-col gap-5">
      <div>
        <div className="flex gap-1 mb-2" data-testid="prescription-form-input-mode-tabs">
          <button
            type="button"
            onClick={() => { setInputMode('medication'); setManualText('') }}
            className={`px-3 py-1 text-xs rounded border ${inputMode === 'medication' ? 'bg-accent text-white border-accent' : 'border-border text-text-mute hover:bg-accent/10'}`}
            data-testid="prescription-form-tab-medication"
          >
            Buscar medicamento
          </button>
          <button
            type="button"
            onClick={() => { setInputMode('ingredient'); setSearch('') }}
            className={`px-3 py-1 text-xs rounded border ${inputMode === 'ingredient' ? 'bg-accent text-white border-accent' : 'border-border text-text-mute hover:bg-accent/10'}`}
            data-testid="prescription-form-tab-ingredient"
          >
            Digitar
          </button>
        </div>

        {inputMode === 'medication' && (
          <>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite para buscar medicamento..."
              className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              data-testid="prescription-form-search"
            />
            {showMedResults && (
              <ul
                className="mt-1 border border-border rounded bg-surface shadow-md max-h-48 overflow-y-auto"
                data-testid="prescription-form-search-results"
              >
                {medicationsPage!.data.map((med) => (
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
            {showMedNoResults && (
              <p className="mt-1 text-sm text-text-mute" data-testid="prescription-form-no-results">
                Nenhum medicamento encontrado.
              </p>
            )}
          </>
        )}

        {inputMode === 'ingredient' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualIngredient() } }}
              placeholder="Ex: Amoxicilina, Metformina..."
              className="flex-1 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              data-testid="prescription-form-manual-input"
            />
            <button
              type="button"
              onClick={addManualIngredient}
              disabled={!manualText.trim()}
              className="px-3 py-2 text-sm rounded border border-accent text-accent hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="prescription-form-manual-add"
            >
              Adicionar
            </button>
          </div>
        )}
      </div>

      {itemsError && (
        <Alert variant="error" data-testid="prescription-form-items-error">
          {itemsError}
        </Alert>
      )}

      {fields.length > 0 && (
        <ul className="flex flex-col gap-4" data-testid="prescription-form-items">
          {fields.map((field, index) => {
            return (
              <li key={field.id} className="border border-border rounded p-3 flex flex-col gap-2" data-testid={`prescription-form-item-${index}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-sm" data-testid={`prescription-form-item-name-${index}`}>
                    {field.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-danger text-xs hover:underline"
                    data-testid={`prescription-form-item-remove-${index}`}
                  >
                    Remover
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`item-dosage-${index}`}
                      className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
                    >
                      Dosagem
                    </label>
                    <Controller
                      control={control}
                      name={`items.${index}.dosage`}
                      render={({ field: f, fieldState }) => (
                        <>
                          <input
                            {...f}
                            id={`item-dosage-${index}`}
                            type="text"
                            className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="Ex: 500mg, 20mg/ml"
                            data-testid={`prescription-form-item-dosage-${index}`}
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
                  <div>
                    <label
                      htmlFor={`item-quantity-${index}`}
                      className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
                    >
                      Quantidade
                    </label>
                    <Controller
                      control={control}
                      name={`items.${index}.quantity`}
                      render={({ field: f, fieldState }) => (
                        <>
                          <input
                            {...f}
                            id={`item-quantity-${index}`}
                            type="text"
                            className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                            placeholder="Ex: 1 caixa, 30 cps"
                            data-testid={`prescription-form-item-quantity-${index}`}
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
            )
          })}
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
