import { DashboardKpiCard } from './DashboardKpiCard'
import type { IDashboardModel } from '../types/dashboard.types'

interface DashboardKpiRowProps {
  kpi: IDashboardModel['kpi']
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function XCircleIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  )
}

export function DashboardKpiRow({ kpi }: DashboardKpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <DashboardKpiCard
        data-testid="dashboard-kpi-scheduled"
        label="Agendados"
        value={kpi.scheduled}
        icon={<CalendarIcon />}
      />
      <DashboardKpiCard
        data-testid="dashboard-kpi-confirmed"
        label="Confirmados"
        value={kpi.confirmed}
        icon={<ClockIcon />}
      />
      <DashboardKpiCard
        data-testid="dashboard-kpi-completed"
        label="Atendidos"
        value={kpi.completed}
        icon={<CheckCircleIcon />}
        variant="success"
      />
      <DashboardKpiCard
        data-testid="dashboard-kpi-no-show"
        label="Faltaram"
        value={kpi.noShow}
        icon={<XCircleIcon />}
        variant="danger"
      />
    </div>
  )
}
