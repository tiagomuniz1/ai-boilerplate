'use client'

import { UserRole } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import { useDeleteScheduleException } from '../hooks/use-delete-schedule-exception.hook'
import type { IScheduleExceptionModel } from '../types/schedule-exception-model.types'

interface BlockBannerProps {
  exception: IScheduleExceptionModel
  role: UserRole
}

function formatWindow(exception: IScheduleExceptionModel): string {
  if (!exception.startTime && !exception.endTime) return 'Dia inteiro'
  return `${exception.startTime} – ${exception.endTime}`
}

export function BlockBanner({ exception, role }: BlockBannerProps) {
  const { mutate: remove, isPending } = useDeleteScheduleException()
  const canManage = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL

  return (
    <div
      data-testid="block-banner"
      className="flex items-center justify-between gap-2 rounded-md bg-danger/10 border border-danger/30 px-3 py-2 text-sm"
    >
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-danger" data-testid="block-banner-window">
          {formatWindow(exception)} · Bloqueado
        </span>
        {exception.reason && (
          <span className="text-xs text-text/60 truncate" data-testid="block-banner-reason">
            {exception.reason}
          </span>
        )}
      </div>

      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => remove(exception.id)}
          disabled={isPending}
          data-testid="block-banner-remove"
          aria-label="Remover bloqueio"
          className="text-danger shrink-0"
        >
          Remover
        </Button>
      )}
    </div>
  )
}
