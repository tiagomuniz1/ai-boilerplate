'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { DAY_OF_WEEK_LABELS } from '../types/schedule-model.types'
import type { IScheduleModel } from '../types/schedule-model.types'

export interface ScheduleDeleteDialogProps {
  schedule: IScheduleModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function ScheduleDeleteDialog({
  schedule,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: ScheduleDeleteDialogProps) {
  if (!schedule) return null

  const dayLabel = DAY_OF_WEEK_LABELS[schedule.dayOfWeek]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir agenda" data-testid="delete-schedule-dialog">
      <div className="flex flex-col gap-4">
        <Typography variant="body" data-testid="delete-schedule-dialog-message">
          Tem certeza que deseja excluir a agenda de{' '}
          <strong>{dayLabel}</strong> ({schedule.startTime}–{schedule.endTime})? Esta ação não pode
          ser desfeita.
        </Typography>
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            data-testid="delete-schedule-dialog-cancel"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isPending}
            disabled={isPending}
            data-testid="delete-schedule-dialog-confirm"
            className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
          >
            Excluir
          </Button>
        </div>
      </div>
    </Modal>
  )
}
