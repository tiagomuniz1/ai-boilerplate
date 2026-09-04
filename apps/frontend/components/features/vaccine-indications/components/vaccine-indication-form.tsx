'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useVaccines } from '@/components/features/vaccines/hooks/use-vaccines.hook'
import type { IVaccineModel } from '@/components/features/vaccines/types/vaccine-model.types'
import type { ICreateVaccineIndicationInput } from '../types/vaccine-indication-input.types'

interface ItemDraft {
  vaccineId: string
  doseLabel: string
  instructions: string
}

const EMPTY_ITEM: ItemDraft = { vaccineId: '', doseLabel: '', instructions: '' }

const CATALOG_PAGE_SIZE = 100

export interface VaccineIndicationFormProps {
  appointmentId: string
  isPending: boolean
  globalError: string | null
  onSubmit: (input: ICreateVaccineIndicationInput) => void
}

export function VaccineIndicationForm({
  appointmentId,
  isPending,
  globalError,
  onSubmit,
}: VaccineIndicationFormProps) {
  // São dezenas de vacinas curadas à mão, não os 36 mil medicamentos da ANVISA:
  // cabe tudo num select, sem busca por tecla. 100 é o teto do PaginationDto
  // (common/dto/pagination.dto.ts) — pedir mais devolve 400 e esvazia o select.
  const { data: vaccines, isLoading: isLoadingVaccines } = useVaccines({ limit: CATALOG_PAGE_SIZE })

  // Se o catálogo passar de uma página, a lista fica incompleta. Dizer isso é
  // melhor do que esconder vacina sem avisar.
  const isCatalogTruncated = !!vaccines && vaccines.total > vaccines.data.length

  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }])
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const filled = items.filter((item) => item.vaccineId)
    if (filled.length === 0) {
      setValidationError('Selecione ao menos uma vacina.')
      return
    }

    setValidationError(null)
    onSubmit({
      appointmentId,
      items: filled.map((item) => ({
        vaccineId: item.vaccineId,
        doseLabel: item.doseLabel,
        instructions: item.instructions,
      })),
      notes,
    })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="vaccine-indication-form" className="flex flex-col gap-4">
      {globalError && (
        <Alert variant="error" data-testid="vaccine-indication-form-error">
          {globalError}
        </Alert>
      )}

      {validationError && (
        <Alert variant="error" data-testid="vaccine-indication-form-validation-error">
          {validationError}
        </Alert>
      )}

      {isCatalogTruncated && (
        <Alert variant="warning" data-testid="vaccine-indication-catalog-truncated">
          Mostrando as primeiras {vaccines!.data.length} de {vaccines!.total} vacinas do catálogo.
        </Alert>
      )}

      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`vaccine-${index}`} className="text-sm text-text-dim">
              Vacina
            </label>
            <select
              id={`vaccine-${index}`}
              value={item.vaccineId}
              disabled={isLoadingVaccines}
              onChange={(event) => updateItem(index, { vaccineId: event.target.value })}
              data-testid={`vaccine-indication-vaccine-select-${index}`}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            >
              <option value="">Selecione a vacina</option>
              {vaccines?.data.map((vaccine: IVaccineModel) => (
                <option key={vaccine.id} value={vaccine.id}>
                  {vaccine.abbreviation ? `${vaccine.name} (${vaccine.abbreviation})` : vaccine.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`dose-${index}`} className="text-sm text-text-dim">
              Dose (opcional)
            </label>
            <input
              id={`dose-${index}`}
              value={item.doseLabel}
              maxLength={40}
              placeholder="1ª dose, reforço…"
              onChange={(event) => updateItem(index, { doseLabel: event.target.value })}
              data-testid={`vaccine-indication-dose-input-${index}`}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`instructions-${index}`} className="text-sm text-text-dim">
              Orientações (opcional)
            </label>
            <textarea
              id={`instructions-${index}`}
              value={item.instructions}
              maxLength={1000}
              rows={2}
              onChange={(event) => updateItem(index, { instructions: event.target.value })}
              data-testid={`vaccine-indication-instructions-input-${index}`}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
            />
          </div>

          {items.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-danger hover:text-danger"
              onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
              data-testid={`vaccine-indication-remove-item-${index}`}
            >
              Remover
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => setItems((current) => [...current, { ...EMPTY_ITEM }])}
        data-testid="vaccine-indication-add-item"
      >
        + Adicionar vacina
      </Button>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="vaccine-indication-notes" className="text-sm text-text-dim">
          Observações (opcional)
        </label>
        <textarea
          id="vaccine-indication-notes"
          value={notes}
          maxLength={2000}
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          data-testid="vaccine-indication-notes-input"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
        />
      </div>

      <Button type="submit" isLoading={isPending} disabled={isPending} data-testid="vaccine-indication-submit">
        Emitir indicação
      </Button>
    </form>
  )
}
