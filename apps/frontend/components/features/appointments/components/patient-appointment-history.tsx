'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
import type { IProfessionalModel } from '@/components/features/professionals/types/professional-model.types'
import { useAppointments } from '../hooks/use-appointments.hook'
import { APPOINTMENT_STATUS_LABELS } from '../types/appointment-model.types'
import type { IAppointmentModel } from '../types/appointment-model.types'

const PAGE_SIZE = 20

const statusStyle: Record<string, string> = {
  scheduled: 'bg-accent/10 text-accent',
  confirmed: 'bg-info/10 text-info',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
  no_show: 'bg-warning/10 text-warning',
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[status] ?? 'bg-line text-text-dim'}`}
      data-testid={`patient-appointment-status-${status}`}
    >
      {APPOINTMENT_STATUS_LABELS[status as keyof typeof APPOINTMENT_STATUS_LABELS] ?? status}
    </span>
  )
}

interface PatientAppointmentHistoryProps {
  patientId: string
}

export function PatientAppointmentHistory({ patientId }: PatientAppointmentHistoryProps) {
  const basePath = useBasePath()
  const role = useAuthStore((s) => s.user?.role)

  // O backend já restringe o PROFESSIONAL às próprias consultas
  // (list-appointments.use-case.ts:29), então o seletor só faz sentido para
  // quem enxerga a clínica inteira. Mesma regra da agenda.
  const canFilterByProfessional = role === UserRole.ADMIN || role === UserRole.USER

  const [professionalId, setProfessionalId] = useState<string>('')
  const [page, setPage] = useState(1)

  const { data: professionals } = useProfessionals(
    { limit: 100 },
    { enabled: canFilterByProfessional },
  )

  const { data, isPending, isError } = useAppointments({
    patientId,
    professionalId: professionalId || undefined,
    page,
    limit: PAGE_SIZE,
  })

  const appointments = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function handleProfessionalChange(value: string) {
    setProfessionalId(value)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-4" data-testid="patient-appointment-history">
      {canFilterByProfessional && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label htmlFor="patient-appointments-professional" className="text-sm text-text-dim">
            Profissional
          </label>
          <select
            id="patient-appointments-professional"
            value={professionalId}
            onChange={(event) => handleProfessionalChange(event.target.value)}
            data-testid="patient-appointment-history-professional-filter"
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
          >
            <option value="">Todos os profissionais</option>
            {professionals?.map((professional: IProfessionalModel) => (
              <option key={professional.id} value={professional.id}>
                {professional.user.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="patient-appointment-history-skeleton">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={20} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="patient-appointment-history-error">
              Não foi possível carregar as consultas deste paciente. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && appointments.length === 0 && (
          <div className="py-16 text-center" data-testid="patient-appointment-history-empty">
            <p className="text-sm text-text-dim">
              {professionalId
                ? 'Nenhuma consulta deste paciente com o profissional selecionado.'
                : 'Este paciente ainda não tem consultas.'}
            </p>
          </div>
        )}

        {!isPending && !isError && appointments.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left" data-testid="patient-appointment-history-table">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Data</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Horário</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Profissional</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Especialidade</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Status</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment: IAppointmentModel) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-line last:border-0 hover:bg-surface-raised"
                      data-testid={`patient-appointment-row-${appointment.id}`}
                    >
                      <td
                        className="px-6 py-4 text-sm font-medium text-text"
                        data-testid={`patient-appointment-date-${appointment.id}`}
                      >
                        {formatDate(appointment.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-dim">
                        {appointment.startTime} — {appointment.endTime}
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`patient-appointment-professional-${appointment.id}`}
                      >
                        {appointment.professionalName}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-dim">
                        {appointment.specialtyName ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`${basePath}/appointments/${appointment.id}`}
                          data-testid={`patient-appointment-link-${appointment.id}`}
                          className="text-sm text-accent hover:underline"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="patient-appointment-history-cards">
              {appointments.map((appointment: IAppointmentModel) => (
                <MobileListCard
                  key={appointment.id}
                  data-testid={`patient-appointment-card-${appointment.id}`}
                  title={formatDate(appointment.date)}
                  rows={[
                    { label: 'Horário', value: `${appointment.startTime} — ${appointment.endTime}` },
                    { label: 'Profissional', value: appointment.professionalName },
                    { label: 'Especialidade', value: appointment.specialtyName ?? '—' },
                    {
                      label: 'Status',
                      value:
                        APPOINTMENT_STATUS_LABELS[
                          appointment.status as keyof typeof APPOINTMENT_STATUS_LABELS
                        ] ?? appointment.status,
                    },
                  ]}
                  actions={
                    <Link
                      href={`${basePath}/appointments/${appointment.id}`}
                      data-testid={`patient-appointment-card-link-${appointment.id}`}
                      className="text-xs text-accent hover:text-accent/80"
                    >
                      Abrir
                    </Link>
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {!isPending && !isError && appointments.length > 0 && (
        <div className="flex items-center justify-between" data-testid="patient-appointment-history-pagination">
          <span className="text-sm text-text-dim" data-testid="patient-appointment-history-page-info">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              data-testid="patient-appointment-history-prev-page"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              data-testid="patient-appointment-history-next-page"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
