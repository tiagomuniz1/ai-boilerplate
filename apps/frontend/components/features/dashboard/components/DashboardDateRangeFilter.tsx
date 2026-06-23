'use client'

interface DashboardDateRangeFilterProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export function DashboardDateRangeFilter({ from, to, onChange }: DashboardDateRangeFilterProps) {
  return (
    <div data-testid="dashboard-date-range" className="flex flex-wrap items-center gap-2">
      <label className="text-sm text-text-dim" htmlFor="filter-from">
        De
      </label>
      <input
        id="filter-from"
        type="date"
        value={from}
        max={to}
        onChange={(e) => onChange(e.target.value, to)}
        className="rounded-md border border-line bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        data-testid="dashboard-date-from"
      />
      <label className="text-sm text-text-dim" htmlFor="filter-to">
        até
      </label>
      <input
        id="filter-to"
        type="date"
        value={to}
        min={from}
        onChange={(e) => onChange(from, e.target.value)}
        className="rounded-md border border-line bg-surface px-2 py-1 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent"
        data-testid="dashboard-date-to"
      />
    </div>
  )
}
