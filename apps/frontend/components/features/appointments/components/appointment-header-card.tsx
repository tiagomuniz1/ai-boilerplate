'use client'

import { useState } from 'react'
import { AppointmentStatus, PatientGender } from '@app/shared'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/atoms/button/button'
import { APPOINTMENT_STATUS_BADGE_CLASS } from '@/lib/appointment-status'
import { calculateAge } from '@/lib/calculate-age'
import { formatDateToBR } from '@/lib/format-date'
import { RecurrenceBadge } from './recurrence-badge'
import {
  APPOINTMENT_STATUS_LABELS,
  type IAppointmentDetailModel,
} from '../types/appointment-model.types'

const genderLabel: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function BackArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('transition-transform duration-150', isOpen && 'rotate-180')}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

interface AppointmentHeaderCardProps {
  appointment: IAppointmentDetailModel
  canManage: boolean
  canAct: boolean
  canReassign: boolean
  hasRecord: boolean
  onBack: () => void
  onFillRecord: () => void
  onCancel: () => void
  onComplete: () => void
  onReassign: () => void
  onViewSeries: () => void
  isPendingComplete: boolean
  isPendingCancel: boolean
}

export function AppointmentHeaderCard({
  appointment,
  canManage,
  canAct,
  canReassign,
  hasRecord,
  onBack,
  onFillRecord,
  onCancel,
  onComplete,
  onReassign,
  onViewSeries,
  isPendingComplete,
  isPendingCancel,
}: AppointmentHeaderCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const badgeClass = APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]
  const age = calculateAge(appointment.patient.birthDate)

  function renderStatusBadge(testId: string) {
    return (
      <span
        data-testid={testId}
        className={cn(
          'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
          badgeClass,
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {APPOINTMENT_STATUS_LABELS[appointment.status]}
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 mb-4">
      {/* Mobile-only: back button + title + status, compact top row */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            data-testid="appointment-detail-back-button-mobile"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-border text-text-dim hover:bg-surface-2 transition-colors shrink-0"
          >
            <BackArrowIcon />
          </button>
          <h1 className="text-lg font-bold text-text">Consulta</h1>
        </div>
        {renderStatusBadge('appointment-detail-status-mobile')}
      </div>

      {/* Mobile-only: patient summary card with collapsible details toggle */}
      <div className="sm:hidden -mx-5 -mt-1 mb-4">
        <div className="flex items-center gap-3 px-5 pb-3">
          <div
            className="w-11 h-11 rounded-full bg-accent-soft text-accent grid place-items-center shrink-0 font-semibold"
            data-testid="appointment-detail-patient-avatar"
          >
            {getInitials(appointment.patient.fullName)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text truncate" data-testid="appointment-detail-patient-name">
              {appointment.patient.fullName}
            </p>
            <p className="text-sm text-text-mute truncate">
              {genderLabel[appointment.patient.gender] ?? appointment.patient.gender}
              {' · '}
              {age} anos
              {appointment.specialtyName && ` · ${appointment.specialtyName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          data-testid="appointment-detail-toggle"
          className="flex items-center gap-1.5 w-full px-5 py-3 border-t border-border text-sm font-medium text-accent hover:bg-surface-2 transition-colors"
        >
          Ver detalhes da consulta
          <ChevronDownIcon isOpen={showDetails} />
        </button>
      </div>

      <div className="hidden sm:flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text">Consulta</h1>
          {renderStatusBadge('appointment-detail-status')}
        </div>

        <div className="flex items-center gap-2">
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
          {canReassign && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPendingCancel || isPendingComplete}
              onClick={onReassign}
              data-testid="appointment-detail-reassign-button"
            >
              Trocar profissional
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

      <div
        data-testid="appointment-detail-full-info"
        className={cn(showDetails ? 'block' : 'hidden', 'sm:block')}
      >
      <hr className="my-4 border-border" />

      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Profissional</dt>
          <dd data-testid="appointment-detail-professional">{appointment.professionalName}</dd>
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
          <dd data-testid="appointment-detail-date">{formatDateToBR(appointment.date)}</dd>
        </div>

        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">Horário</dt>
          <dd data-testid="appointment-detail-time">
            {appointment.startTime} – {appointment.endTime}
          </dd>
        </div>

        {appointment.seriesId &&
          appointment.seriesSequence !== null &&
          appointment.seriesTotalOccurrences !== null && (
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                Recorrência
              </dt>
              <dd className="flex flex-wrap items-center gap-2">
                <RecurrenceBadge
                  sequence={appointment.seriesSequence}
                  total={appointment.seriesTotalOccurrences}
                  data-testid="appointment-detail-series"
                />
                <button
                  type="button"
                  onClick={onViewSeries}
                  data-testid="appointment-detail-view-series-button"
                  className="text-sm text-accent underline underline-offset-2 hover:opacity-80"
                >
                  Ver série
                </button>
              </dd>
            </div>
          )}

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
    </div>
  )
}
