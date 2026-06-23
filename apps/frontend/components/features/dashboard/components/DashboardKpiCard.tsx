import { cn } from '@/lib/cn'

export interface DashboardKpiCardProps {
  label: string
  value: number
  icon: React.ReactNode
  variant?: 'default' | 'success' | 'danger'
  'data-testid'?: string
}

const variantClasses = {
  default: 'bg-surface border-line text-text',
  success: 'bg-good-soft border-good text-good',
  danger: 'bg-danger-soft border-danger text-danger',
}

export function DashboardKpiCard({ label, value, icon, variant = 'default', 'data-testid': testId }: DashboardKpiCardProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4',
        variantClasses[variant],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-dim">{label}</span>
        <span className="opacity-70">{icon}</span>
      </div>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  )
}
