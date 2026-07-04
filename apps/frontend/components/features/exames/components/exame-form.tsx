'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import type { ICreateExamRequestInput } from '../types/exam-request-input.types'

const itemSchema = z.object({
  name: z.string().min(1, 'Nome do exame obrigatório').max(200, 'Máximo 200 caracteres'),
  observations: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
})

const schema = z.object({
  items: z.array(itemSchema).min(1, 'Adicione ao menos um exame'),
  notes: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
})

type FormValues = z.infer<typeof schema>

export interface ExameFormProps {
  appointmentId: string
  isPending: boolean
  globalError: string | null
  onSubmit: (input: ICreateExamRequestInput) => void
}

export function ExameForm({ appointmentId, isPending, globalError, onSubmit }: ExameFormProps) {
  const { control, register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [{ name: '', observations: '' }], notes: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  function onFormSubmit(values: FormValues) {
    onSubmit({
      appointmentId,
      items: values.items.map((item) => ({
        name: item.name,
        ...(item.observations ? { observations: item.observations } : {}),
      })),
      notes: values.notes || undefined,
    })
  }

  const itemsError = errors.items?.message

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} data-testid="exame-form" className="flex flex-col gap-5">
      {itemsError && (
        <Alert variant="error" data-testid="exame-form-items-error">
          {itemsError}
        </Alert>
      )}

      <ul className="flex flex-col gap-4" data-testid="exame-form-items">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="border border-border rounded p-3 flex flex-col gap-2"
            data-testid={`exame-form-item-${index}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Exame {index + 1}
              </span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-danger text-xs hover:underline"
                  data-testid={`exame-form-item-remove-${index}`}
                >
                  Remover
                </button>
              )}
            </div>
            <div>
              <label
                htmlFor={`exame-item-name-${index}`}
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Nome do exame
              </label>
              <input
                {...register(`items.${index}.name`)}
                id={`exame-item-name-${index}`}
                type="text"
                placeholder="Ex: Hemograma completo"
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                data-testid={`exame-form-item-name-${index}`}
              />
              {errors.items?.[index]?.name && (
                <p role="alert" className="text-danger text-xs mt-0.5">
                  {errors.items[index]?.name?.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor={`exame-item-observations-${index}`}
                className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
              >
                Observação (opcional)
              </label>
              <input
                {...register(`items.${index}.observations`)}
                id={`exame-item-observations-${index}`}
                type="text"
                placeholder="Ex: Jejum de 8 horas"
                className="w-full border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                data-testid={`exame-form-item-observations-${index}`}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => append({ name: '', observations: '' })}
        className="text-sm text-accent hover:underline self-start"
        data-testid="exame-form-add-item"
      >
        + Adicionar exame
      </button>

      <div>
        <label
          htmlFor="exame-notes"
          className="block text-xs font-medium uppercase tracking-wider text-text-mute mb-1"
        >
          Observações gerais
        </label>
        <textarea
          {...register('notes')}
          id="exame-notes"
          rows={3}
          className="w-full border border-border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Observações adicionais (opcional)..."
          data-testid="exame-form-notes"
        />
        {errors.notes && (
          <p role="alert" className="text-danger text-xs mt-0.5">{errors.notes.message}</p>
        )}
      </div>

      {globalError && (
        <Alert variant="error" data-testid="exame-form-error">
          {globalError}
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="exame-form-submit"
        >
          Solicitar exames
        </Button>
      </div>
    </form>
  )
}
