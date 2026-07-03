'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

const COLORS = ['#2563eb', '#7c3aed']

export function formatInsuranceTooltip(value: any, name: any): [any, any] {
  return [value, name]
}

interface InsuranceChartCardProps {
  insurance: IDashboardModel['insurance']
}

export function InsuranceChartCard({ insurance }: InsuranceChartCardProps) {
  const data = [
    { name: 'Particular', value: insurance.particular },
    { name: 'Convênio', value: insurance.convenio },
  ]

  const hasData = insurance.total > 0

  return (
    <div data-testid="dashboard-insurance-chart" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Pacientes x Convênio</span>

      {hasData ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={formatInsuranceTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-text">{insurance.total}</span>
          </div>
        </div>
      ) : (
        <div className="flex h-[140px] items-center justify-center text-sm text-text-mute">
          Sem dados de convênio
        </div>
      )}

      <div className="flex flex-col gap-1">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
              <span className="text-text-dim">{item.name}</span>
            </span>
            <span className="font-semibold text-text">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
