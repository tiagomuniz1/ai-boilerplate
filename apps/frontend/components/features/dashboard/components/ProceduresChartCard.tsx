'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#6b7280']

export function formatProcedureTooltip(value: any, name: any): [any, any] {
  return [value, name]
}

interface ProceduresChartCardProps {
  procedures: IDashboardModel['procedures']
}

export function ProceduresChartCard({ procedures }: ProceduresChartCardProps) {
  const hasData = procedures.total > 0

  return (
    <div data-testid="dashboard-procedures-chart" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Procedimentos realizados</span>

      {hasData ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={procedures.items}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                dataKey="value"
                nameKey="label"
                startAngle={90}
                endAngle={-270}
              >
                {procedures.items.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatProcedureTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-text">{procedures.total}</span>
          </div>
        </div>
      ) : (
        <div className="flex h-[140px] items-center justify-center text-sm text-text-mute">
          Sem procedimentos no período
        </div>
      )}

      <div className="flex flex-col gap-1">
        {procedures.items.slice(0, 4).map((item, index) => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-text-dim truncate max-w-[120px]">{item.label}</span>
            </span>
            <span className="font-semibold text-text">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
