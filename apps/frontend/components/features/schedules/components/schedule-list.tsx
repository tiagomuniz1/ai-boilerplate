'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { useAuthStore } from '@/stores/auth.store'
import { useDoctors } from '@/components/features/doctors/hooks/use-doctors.hook'
import { useSchedules } from '../hooks/use-schedules.hook'
import { useDeleteSchedule } from '../hooks/use-delete-schedule.hook'
import { ScheduleListSkeleton } from './schedule-list-skeleton'
import { ScheduleDeleteDialog } from './schedule-delete-dialog'
import { DAY_OF_WEEK_LABELS } from '../types/schedule-model.types'
import type { IScheduleModel } from '../types/schedule-model.types'
import type { DayOfWeek } from '@app/shared'
import { cn } from '@/lib/cn'

export function ScheduleList() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === UserRole.ADMIN
  const canManageSchedules = user?.role === UserRole.ADMIN || user?.role === UserRole.DOCTOR

  const [filterDoctorId, setFilterDoctorId] = useState('')
  const [filterDayOfWeek, setFilterDayOfWeek] = useState('')
  const [filterActiveOn, setFilterActiveOn] = useState('')
  const [scheduleToDelete, setScheduleToDelete] = useState<IScheduleModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const params = {
    ...(filterDoctorId ? { doctorId: filterDoctorId } : {}),
    ...(filterDayOfWeek ? { dayOfWeek: filterDayOfWeek as DayOfWeek } : {}),
    ...(filterActiveOn ? { activeOn: filterActiveOn } : {}),
  }

  const { data: schedulesPage, isPending, isError } = useSchedules(params)
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule()
  const { data: doctorsList } = useDoctors({ limit: 100 })
  const doctors = doctorsList ?? []

  const schedules = schedulesPage?.data ?? []

  function handleDeleteClick(schedule: IScheduleModel) {
    setScheduleToDelete(schedule)
  }

  function handleDeleteClose() {
    setScheduleToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!scheduleToDelete) return

    deleteSchedule(scheduleToDelete.id, {
      onSuccess: () => {
        setScheduleToDelete(null)
        setSuccessMessage('Agenda excluída com sucesso.')
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setScheduleToDelete(null)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="schedule-list">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Agendas</h1>
          {!isPending && !isError && (
            <p className="mt-0.5 text-sm text-text-dim">
              {schedulesPage?.total === 1
                ? '1 agenda encontrada'
                /* c8 ignore next */
                : `${schedulesPage?.total ?? 0} agendas encontradas`}
            </p>
          )}
        </div>
        {canManageSchedules && (
          <Link href="/schedules/new">
            <Button variant="primary" data-testid="schedule-list-new-button">
              + Nova agenda
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {isAdmin && (
          <div className="flex flex-col gap-1.5 min-w-[200px]" data-testid="schedule-filter-doctor">
            <label htmlFor="filter-doctor" className="text-sm font-medium text-text">
              Médico
            </label>
            <select
              id="filter-doctor"
              value={filterDoctorId}
              onChange={(e) => setFilterDoctorId(e.target.value)}
              className={cn(
                'h-10 rounded-md px-3 text-sm',
                'bg-surface border border-line text-text',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              )}
              data-testid="schedule-filter-doctor-select"
            >
              <option value="">Todos os médicos</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.fullName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-day" className="text-sm font-medium text-text">
            Dia da semana
          </label>
          <select
            id="filter-day"
            value={filterDayOfWeek}
            onChange={(e) => setFilterDayOfWeek(e.target.value)}
            className={cn(
              'h-10 rounded-md px-3 text-sm',
              'bg-surface border border-line text-text',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
            data-testid="schedule-filter-day"
          >
            <option value="">Todos os dias</option>
            {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-active-on" className="text-sm font-medium text-text">
            Data de referência
          </label>
          <input
            id="filter-active-on"
            type="date"
            value={filterActiveOn}
            onChange={(e) => setFilterActiveOn(e.target.value)}
            className={cn(
              'h-10 rounded-md px-3 text-sm',
              'bg-surface border border-line text-text',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            )}
            data-testid="schedule-filter-active-on"
          />
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" data-testid="schedule-list-success">
          {successMessage}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <ScheduleListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="schedule-list-error">
              Não foi possível carregar a lista de agendas. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && schedules.length === 0 && (
          <div className="py-16 text-center" data-testid="schedule-list-empty">
            <p className="text-sm text-text-dim">Nenhuma agenda encontrada.</p>
          </div>
        )}

        {!isPending && !isError && schedules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="schedule-list-table">
              <thead>
                <tr className="border-b border-line">
                  {isAdmin && (
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                      Médico
                    </th>
                  )}
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Dia da semana
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Horário
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Duração do slot
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Validade
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const doctorName = isAdmin
                    ? doctors.find((d) => d.id === schedule.doctorId)?.user.fullName ?? schedule.doctorId
                    : null
                  return (
                    <tr
                      key={schedule.id}
                      data-testid={`schedule-table-row-${schedule.id}`}
                      className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                    >
                      {isAdmin && (
                        <td
                          className="px-6 py-4 text-sm text-text"
                          data-testid={`schedule-doctor-${schedule.id}`}
                        >
                          {doctorName}
                        </td>
                      )}
                      <td
                        className="px-6 py-4 text-sm text-text"
                        data-testid={`schedule-day-${schedule.id}`}
                      >
                        {DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim whitespace-nowrap"
                        data-testid={`schedule-time-${schedule.id}`}
                      >
                        {schedule.startTime} – {schedule.endTime}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`schedule-slot-${schedule.id}`}
                      >
                        {schedule.slotDurationInMinutes} min
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`schedule-validity-${schedule.id}`}
                      >
                        {schedule.validFrom || schedule.validUntil
                          ? `${schedule.validFrom ?? '∞'} → ${schedule.validUntil ?? '∞'}`
                          : 'Indefinida'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {canManageSchedules && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(schedule)}
                                data-testid={`schedule-delete-button-${schedule.id}`}
                                className="text-xs text-danger hover:text-danger/80"
                              >
                                Excluir
                              </Button>
                              <Link
                                href={`/schedules/${schedule.id}/edit`}
                                data-testid={`schedule-edit-link-${schedule.id}`}
                                className="text-xs text-text-mute hover:text-text transition-colors"
                              >
                                Editar
                              </Link>
                            </>
                          )}
                          <Link
                            href={`/schedules/${schedule.id}`}
                            data-testid={`schedule-view-link-${schedule.id}`}
                            className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                            aria-label="Ver detalhes"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ScheduleDeleteDialog
        schedule={scheduleToDelete}
        isOpen={scheduleToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
