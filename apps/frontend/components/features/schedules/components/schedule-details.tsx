'use client'

import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { formatDateToBR } from '@/lib/format-date'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { DAY_OF_WEEK_LABELS } from '../types/schedule-model.types'
import type { IScheduleModel } from '../types/schedule-model.types'

interface ScheduleDetailsProps {
  schedule: IScheduleModel
  canManageSchedules: boolean
  onDeleteClick: () => void
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-mute">{label}</span>
      <span className="text-sm text-text" data-testid={testId}>
        {value}
      </span>
    </div>
  )
}

export function ScheduleDetails({ schedule, canManageSchedules, onDeleteClick }: ScheduleDetailsProps) {
  const basePath = useBasePath()
  const dayLabel = DAY_OF_WEEK_LABELS[schedule.dayOfWeek]

  return (
    <div className="flex flex-col gap-6" data-testid="schedule-details">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Typography variant="h2" data-testid="schedule-details-title">
            Agenda — {dayLabel}
          </Typography>
          <p className="mt-0.5 text-sm text-text-dim" data-testid="schedule-details-time">
            {schedule.startTime} – {schedule.endTime}
          </p>
        </div>
        {canManageSchedules && (
          <div className="flex items-center gap-2">
            <Link href={`${basePath}/schedules/${schedule.id}/edit`}>
              <Button variant="ghost" size="sm" data-testid="schedule-details-edit-button">
                Editar
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={onDeleteClick}
              data-testid="schedule-details-delete-button"
              className="bg-danger hover:bg-danger/90 focus-visible:ring-danger"
            >
              Excluir
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-6 py-4">
            <DetailRow label="Dia da semana" value={dayLabel} testId="schedule-details-day" />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Horário"
              value={`${schedule.startTime} – ${schedule.endTime}`}
              testId="schedule-details-time-range"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Duração do slot"
              value={`${schedule.slotDurationInMinutes} minutos`}
              testId="schedule-details-slot"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Válido de"
              value={schedule.validFrom ? formatDateToBR(schedule.validFrom) : 'Indefinido'}
              testId="schedule-details-valid-from"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Válido até"
              value={schedule.validUntil ? formatDateToBR(schedule.validUntil) : 'Indefinido'}
              testId="schedule-details-valid-until"
            />
          </div>
          <div className="bg-surface px-6 py-4">
            <DetailRow
              label="Cadastrado em"
              value={schedule.createdAt.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
              testId="schedule-details-created-at"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
