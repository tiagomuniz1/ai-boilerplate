'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppointmentCancellationScope } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'

const cancelSchema = z.object({
  cancellationReason: z.string().max(500).optional().or(z.literal('')),
  scope: z.nativeEnum(AppointmentCancellationScope),
})

type CancelFormValues = z.infer<typeof cancelSchema>

export interface ICancelConfirmInput {
  cancellationReason?: string
  scope: AppointmentCancellationScope
}

interface CancelAppointmentDialogProps {
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: (input: ICancelConfirmInput) => void
  seriesId?: string | null
  /** Still-cancellable occurrences after this one. */
  seriesFutureCount?: number | null
}

export function CancelAppointmentDialog({
  isOpen,
  isPending,
  onClose,
  onConfirm,
  seriesId,
  seriesFutureCount,
}: CancelAppointmentDialogProps) {
  const { register, handleSubmit, watch, reset } = useForm<CancelFormValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: {
      cancellationReason: '',
      scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
    },
  })

  // The dialog stays mounted (it is the Modal that returns null), so without an
  // explicit reset the chosen scope would leak into the next time it opens.
  useEffect(() => {
    if (!isOpen) {
      reset({
        cancellationReason: '',
        scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
      })
    }
  }, [isOpen, reset])

  // On the last occurrence "this and all future" would cancel exactly one — the
  // choice would be noise, so it is not offered.
  const futureCount = seriesFutureCount ?? 0
  const showScopeChoice = !!seriesId && futureCount > 0

  const scope = watch('scope')
  const cancelsSeries = showScopeChoice && scope === AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES
  const affectedCount = cancelsSeries ? futureCount + 1 : 1

  function onSubmit(values: CancelFormValues) {
    onConfirm({
      cancellationReason: values.cancellationReason || undefined,
      scope: showScopeChoice ? values.scope : AppointmentCancellationScope.SINGLE_OCCURRENCE,
    })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar consulta"
      data-testid="cancel-appointment-dialog"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {showScopeChoice && (
          <fieldset className="space-y-2" data-testid="cancel-dialog-scope">
            <legend className="block text-sm font-medium mb-1">O que deseja cancelar?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={AppointmentCancellationScope.SINGLE_OCCURRENCE}
                data-testid="cancel-dialog-scope-occurrence"
                {...register('scope')}
              />
              Apenas esta consulta
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                value={AppointmentCancellationScope.THIS_AND_FUTURE_OCCURRENCES}
                data-testid="cancel-dialog-scope-series"
                {...register('scope')}
              />
              Esta e todas as futuras da série
            </label>
          </fieldset>
        )}

        <p className="text-sm text-text/70" data-testid="cancel-dialog-scope-summary">
          {cancelsSeries
            ? `Serão canceladas ${affectedCount} consultas: esta e todas as futuras desta série. Esta ação não pode ser desfeita.`
            : 'Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.'}
        </p>

        <div>
          <label htmlFor="cancellationReason" className="block text-sm font-medium mb-1">
            Motivo do cancelamento (opcional)
          </label>
          <textarea
            id="cancellationReason"
            data-testid="cancel-reason-input"
            {...register('cancellationReason')}
            rows={3}
            maxLength={500}
            placeholder="Descreva o motivo do cancelamento..."
            className="w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="cancel-dialog-cancel"
          >
            Voltar
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isPending}
            data-testid="cancel-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            {cancelsSeries ? `Cancelar ${affectedCount} consultas` : 'Cancelar consulta'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
