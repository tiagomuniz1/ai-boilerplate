'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { useBasePath } from '@/lib/slug-context'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
import { useSchedules } from '../hooks/use-schedules.hook'
import { useDeleteSchedule } from '../hooks/use-delete-schedule.hook'
import { ScheduleListSkeleton } from './schedule-list-skeleton'
import { ScheduleDeleteDialog } from './schedule-delete-dialog'
import { DAY_OF_WEEK_LABELS } from '../types/schedule-model.types'
import type { IScheduleModel } from '../types/schedule-model.types'
import type { DayOfWeek } from '@app/shared'
import { cn } from '@/lib/cn'

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" />
    </svg>
  )
}

function scheduleValidityLabel(schedule: IScheduleModel): string {
  return schedule.validFrom || schedule.validUntil
    ? `${schedule.validFrom ?? '∞'} → ${schedule.validUntil ?? '∞'}`
    : 'Indefinida'
}

export function ScheduleList() {
  const basePath = useBasePath()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === UserRole.ADMIN
  const canManageSchedules = user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSIONAL

  const [filterDoctorId, setFilterDoctorId] = useState('')
  const [filterDayOfWeek, setFilterDayOfWeek] = useState('')
  const [filterActiveOn, setFilterActiveOn] = useState('')
  const [scheduleToDelete, setScheduleToDelete] = useState<IScheduleModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const params = {
    ...(filterDoctorId ? { professionalId: filterDoctorId } : {}),
    ...(filterDayOfWeek ? { dayOfWeek: filterDayOfWeek as DayOfWeek } : {}),
    ...(filterActiveOn ? { activeOn: filterActiveOn } : {}),
  }

  const { data: schedulesPage, isPending, isError } = useSchedules(params)
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule()
  const { data: doctorsList } = useProfessionals({ limit: 100 })
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
          <Link href={`${basePath}/schedules/new`} className="block sm:inline-block">
            <Button variant="primary" data-testid="schedule-list-new-button" className="w-full sm:w-auto">
              + Nova agenda
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {isAdmin && (
          <div className="flex flex-col gap-1.5 min-w-[200px]" data-testid="schedule-filter-professional">
            <label htmlFor="filter-doctor" className="text-sm font-medium text-text">
              Profissional
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
              data-testid="schedule-filter-professional-select"
            >
              <option value="">Todos os profissionais</option>
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
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="schedule-list-table">
              <thead>
                <tr className="border-b border-line">
                  {isAdmin && (
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                      Profissional
                    </th>
                  )}
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Dia da semana
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Horário
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute lg:table-cell">
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
                  const professionalName = isAdmin ? schedule.professionalName : null
                  return (
                    <tr
                      key={schedule.id}
                      data-testid={`schedule-table-row-${schedule.id}`}
                      className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                    >
                      {isAdmin && (
                        <td
                          className="px-6 py-4 text-sm text-text whitespace-nowrap"
                          data-testid={`schedule-professional-${schedule.id}`}
                        >
                          {professionalName}
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
                        className="hidden px-6 py-4 text-sm text-text-dim lg:table-cell"
                        data-testid={`schedule-slot-${schedule.id}`}
                      >
                        {schedule.slotDurationInMinutes} min
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`schedule-validity-${schedule.id}`}
                      >
                        {scheduleValidityLabel(schedule)}
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
                                href={`${basePath}/schedules/${schedule.id}/edit`}
                                data-testid={`schedule-edit-link-${schedule.id}`}
                                className="text-xs text-text-mute hover:text-text transition-colors"
                              >
                                Editar
                              </Link>
                            </>
                          )}
                          <Link
                            href={`${basePath}/schedules/${schedule.id}`}
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

        {!isPending && !isError && schedules.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="schedule-list-cards">
            {schedules.map((schedule) => (
              <MobileListCard
                key={schedule.id}
                data-testid={`schedule-card-${schedule.id}`}
                title={isAdmin ? schedule.professionalName : DAY_OF_WEEK_LABELS[schedule.dayOfWeek]}
                rows={[
                  ...(isAdmin
                    ? [{ icon: <CalendarIcon />, label: 'Dia da semana', value: DAY_OF_WEEK_LABELS[schedule.dayOfWeek] }]
                    : []),
                  { icon: <ClockIcon />, label: 'Horário', value: `${schedule.startTime} – ${schedule.endTime}` },
                  { icon: <ClockIcon />, label: 'Duração do slot', value: `${schedule.slotDurationInMinutes} min` },
                  { icon: <ShieldIcon />, label: 'Validade', value: scheduleValidityLabel(schedule) },
                ]}
                actions={
                  <>
                    {canManageSchedules && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(schedule)}
                          data-testid={`schedule-card-delete-button-${schedule.id}`}
                          className="text-xs text-danger hover:text-danger/80"
                        >
                          Excluir
                        </Button>
                        <Link
                          href={`${basePath}/schedules/${schedule.id}/edit`}
                          data-testid={`schedule-card-edit-link-${schedule.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                      </>
                    )}
                    <Link
                      href={`${basePath}/schedules/${schedule.id}`}
                      data-testid={`schedule-card-view-link-${schedule.id}`}
                      className="ml-auto flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                    >
                      Ver detalhes
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </>
                }
              />
            ))}
          </ul>
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
