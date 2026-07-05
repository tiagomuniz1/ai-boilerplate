'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'

interface CompleteAppointmentDialogProps {
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function CompleteAppointmentDialog({
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: CompleteAppointmentDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Concluir consulta"
      data-testid="complete-appointment-dialog"
    >
      <div className="space-y-4">
        <p className="text-sm text-text/70">
          Tem certeza que deseja concluir esta consulta? Esta ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="complete-dialog-cancel"
          >
            Voltar
          </Button>
          <Button
            type="button"
            variant="primary"
            isLoading={isPending}
            onClick={onConfirm}
            data-testid="complete-dialog-confirm"
          >
            Concluir consulta
          </Button>
        </div>
      </div>
    </Modal>
  )
}
