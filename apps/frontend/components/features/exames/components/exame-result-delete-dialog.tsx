'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'

export interface ExameResultDeleteDialogProps {
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ExameResultDeleteDialog({
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: ExameResultDeleteDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remover resultado" data-testid="exame-result-delete-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="exame-result-delete-dialog-message">
          Tem certeza que deseja remover este resultado? Esta ação não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="exame-result-delete-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="exame-result-delete-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Remover
          </Button>
        </div>
      </div>
    </Modal>
  )
}
