'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IUserModel } from '../types/user-model.types'

export interface DeleteUserDialogProps {
  user: IUserModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteUserDialog({ user, isOpen, isPending, onClose, onConfirm }: DeleteUserDialogProps) {
  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir usuário" data-testid="delete-user-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-user-dialog-message">
          Tem certeza que deseja excluir o usuário <strong>{user.fullName}</strong>? Esta ação não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-user-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-user-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
