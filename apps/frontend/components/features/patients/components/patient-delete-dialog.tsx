'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import type { IPatientModel } from '../types/patient-model.types'

export interface PatientDeleteDialogProps {
  patient: IPatientModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PatientDeleteDialog({
  patient,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: PatientDeleteDialogProps) {
  if (!patient) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir paciente" data-testid="delete-patient-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-patient-dialog-message">
          Tem certeza que deseja excluir o paciente <strong>{patient.fullName}</strong>? Esta ação
          não pode ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-patient-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-patient-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
