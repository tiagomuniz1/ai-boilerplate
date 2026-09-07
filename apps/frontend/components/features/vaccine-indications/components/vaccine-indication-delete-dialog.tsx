'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'

export interface VaccineIndicationDeleteDialogProps {
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function VaccineIndicationDeleteDialog({
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: VaccineIndicationDeleteDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir indicação"
      data-testid="vaccine-indication-delete-dialog"
    >
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="vaccine-indication-delete-dialog-message">
          Tem certeza que deseja excluir esta indicação? Esta ação não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="vaccine-indication-delete-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="vaccine-indication-delete-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
