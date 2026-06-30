'use client'

import { AppointmentStatus } from '@app/shared'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/atoms/button/button'
import { APPOINTMENT_STATUS_BADGE_CLASS } from '@/lib/appointment-status'
import {
  APPOINTMENT_STATUS_LABELS,
  type IAppointmentDetailModel,
} from '../types/appointment-model.types'

interface AppointmentHeaderCardProps {
  appointment: IAppointmentDetailModel
  canManage: boolean
  canAct: boolean
  hasRecord: boolean
  onFillRecord: () => void
  onCancel: () => void
  onComplete: () => void
  isPendingComplete: boolean
  isPendingCancel: boolean
}

export function AppointmentHeaderCard({
  appointment,
  canManage,
  canAct,
  hasRecord,
  onFillRecord,
  onCancel,
  onComplete,
  isPendingComplete,
  isPendingCancel,
}: AppointmentHeaderCardProps) {
  const badgeClass = APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]

  return (
    <div className="rounded-xl border border-border bg-surface p-5 mb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Consulta</h1>
          <span
            data-testid="appointment-detail-status"
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
              badgeClass,
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {APPOINTMENT_STATUS_LABELS[appointment.status]}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {canManage && !hasRecord && appointment.status !== AppointmentStatus.CANCELLED && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFillRecord}
              data-testid="header-fill-record-button"
            >
              Preencher prontuário
            </Button>
          )}
          {canAct && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isLoading={isPendingCancel}
                disabled={isPendingCancel || isPendingComplete}
                onClick={onCancel}
                className="text-danger hover:bg-danger/10"
                data-testid="appointment-detail-cancel-button"
              >
                Cancelar consulta
              </Button>
              <Button
                type="button"
                size="sm"
                isLoading={isPendingComplete}
                disabled={isPendingCancel || isPendingComplete}
                onClick={onComplete}
                data-testid="appointment-detail-complete-button"
              >
                Concluir
              </Button>
            </>
          )}
        </div>
      </div>

      <hr className="my-4 border-border" />

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Médico</dt>
          <dd data-testid="appointment-detail-doctor">{appointment.doctorName}</dd>
        </div>

        {appointment.specialtyName && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
              Especialidade
            </dt>
            <dd data-testid="appointment-detail-specialty">{appointment.specialtyName}</dd>
          </div>
        )}

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Data</dt>
          <dd data-testid="appointment-detail-date">{appointment.date}</dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Horário</dt>
          <dd data-testid="appointment-detail-time">
            {appointment.startTime} – {appointment.endTime}
          </dd>
        </div>

        {appointment.reason && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Motivo</dt>
            <dd data-testid="appointment-detail-reason">{appointment.reason}</dd>
          </div>
        )}

        {appointment.cancellationReason && (
          <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-5">
            <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
              Motivo cancelamento
            </dt>
            <dd data-testid="appointment-detail-cancellation-reason">
              {appointment.cancellationReason}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
