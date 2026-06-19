'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'

const cancelSchema = z.object({
  cancellationReason: z.string().max(500).optional().or(z.literal('')),
})

type CancelFormValues = z.infer<typeof cancelSchema>

interface CancelAppointmentDialogProps {
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: (cancellationReason?: string) => void
}

export function CancelAppointmentDialog({
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: CancelAppointmentDialogProps) {
  const { register, handleSubmit } = useForm<CancelFormValues>({
    resolver: zodResolver(cancelSchema),
  })

  function onSubmit(values: CancelFormValues) {
    onConfirm(values.cancellationReason || undefined)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar consulta"
      data-testid="cancel-appointment-dialog"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-text/70">
          Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
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
            Cancelar consulta
          </Button>
        </div>
      </form>
    </Modal>
  )
}
