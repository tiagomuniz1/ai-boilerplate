import type { ReactNode } from 'react'

export interface MobileListCardRow {
  icon?: ReactNode
  label: string
  value: ReactNode
}

export interface MobileListCardProps {
  title: ReactNode
  rows: MobileListCardRow[]
  actions?: ReactNode
  'data-testid'?: string
}

export function MobileListCard({
  title,
  rows,
  actions,
  'data-testid': testId,
}: MobileListCardProps) {
  return (
    <li
      className="rounded-xl border border-line bg-surface p-4"
      data-testid={testId}
    >
      <p className="font-semibold text-text" data-testid={testId && `${testId}-title`}>
        {title}
      </p>

      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-1.5 text-text-mute shrink-0">
              {row.icon}
              {row.label}
            </dt>
            <dd className="text-text text-right">{row.value}</dd>
          </div>
        ))}
      </dl>

      {actions && (
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          {actions}
        </div>
      )}
    </li>
  )
}
