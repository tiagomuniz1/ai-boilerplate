'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IDoctorModel } from '../types/doctor-model.types'

export interface DoctorDeleteDialogProps {
  doctor: IDoctorModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DoctorDeleteDialog({
  doctor,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: DoctorDeleteDialogProps) {
  if (!doctor) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir médico" data-testid="delete-doctor-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-doctor-dialog-message">
          Tem certeza que deseja excluir o médico <strong>{doctor.user.fullName}</strong>? Esta ação
          não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-doctor-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-doctor-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
