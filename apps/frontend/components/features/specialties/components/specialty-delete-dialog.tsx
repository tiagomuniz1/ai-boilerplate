'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { ISpecialtyModel } from '../types/specialty-model.types'

export interface SpecialtyDeleteDialogProps {
  specialty: ISpecialtyModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function SpecialtyDeleteDialog({
  specialty,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: SpecialtyDeleteDialogProps) {
  if (!specialty) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir especialidade" data-testid="delete-specialty-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-specialty-dialog-message">
          Tem certeza que deseja excluir a especialidade <strong>{specialty.name}</strong>? Esta ação
          não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-specialty-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-specialty-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
