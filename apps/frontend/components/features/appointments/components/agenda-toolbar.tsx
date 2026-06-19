'use client'

import { UserRole } from '@app/shared'
import { Button } from '@/components/ui/atoms/button/button'
import type { IDoctorModel } from '@/components/features/doctors/types/doctor-model.types'

type AgendaView = 'day' | 'week'

interface AgendaToolbarProps {
  currentDate: Date
  view: AgendaView
  onDateChange: (date: Date) => void
  onViewChange: (view: AgendaView) => void
  role: UserRole
  doctors?: IDoctorModel[]
  selectedDoctorId: string | null
  onDoctorChange: (doctorId: string | null) => void
  onBlockTime?: () => void
}

function formatDateLabel(date: Date, view: AgendaView): string {
  if (view === 'day') {
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  const end = new Date(date)
  end.setDate(end.getDate() + 6)
  return `${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

export function AgendaToolbar({
  currentDate,
  view,
  onDateChange,
  onViewChange,
  role,
  doctors,
  selectedDoctorId,
  onDoctorChange,
  onBlockTime,
}: AgendaToolbarProps) {
  const step = view === 'day' ? 1 : 7

  function goBack() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - step)
    onDateChange(d)
  }

  function goForward() {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + step)
    onDateChange(d)
  }

  function goToday() {
    onDateChange(new Date())
  }

  const showDoctorSelector = role === UserRole.ADMIN || role === UserRole.USER
  const canBlockTime = role === UserRole.ADMIN || role === UserRole.DOCTOR
  const blockTimeDisabled = role === UserRole.ADMIN && !selectedDoctorId

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4" data-testid="agenda-toolbar">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={goBack} data-testid="toolbar-prev" aria-label="Anterior">
          ‹
        </Button>
        <Button variant="ghost" size="sm" onClick={goToday} data-testid="toolbar-today">
          Hoje
        </Button>
        <Button variant="ghost" size="sm" onClick={goForward} data-testid="toolbar-next" aria-label="Próximo">
          ›
        </Button>
      </div>

      <span className="text-sm font-medium capitalize" data-testid="toolbar-date-label">
        {formatDateLabel(currentDate, view)}
      </span>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant={view === 'day' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('day')}
          data-testid="toolbar-view-day"
        >
          Dia
        </Button>
        <Button
          variant={view === 'week' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onViewChange('week')}
          data-testid="toolbar-view-week"
        >
          Semana
        </Button>
      </div>

      {showDoctorSelector && (
        <div data-testid="toolbar-doctor-selector">
          <select
            data-testid="toolbar-doctor-select"
            value={selectedDoctorId ?? ''}
            onChange={(e) => onDoctorChange(e.target.value || null)}
            className="rounded-md border border-line bg-surface-2 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Selecione um médico</option>
            {doctors?.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {canBlockTime && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBlockTime}
          disabled={blockTimeDisabled}
          data-testid="toolbar-block-time"
        >
          Bloquear horário
        </Button>
      )}
    </div>
  )
}
