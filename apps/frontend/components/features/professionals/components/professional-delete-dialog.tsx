'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IProfessionalModel } from '../types/professional-model.types'

export interface ProfessionalDeleteDialogProps {
  professional: IProfessionalModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ProfessionalDeleteDialog({
  professional,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: ProfessionalDeleteDialogProps) {
  if (!professional) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir profissional" data-testid="delete-professional-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-professional-dialog-message">
          Tem certeza que deseja excluir o profissional <strong>{professional.user.fullName}</strong>? Esta ação
          não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-professional-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-professional-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
