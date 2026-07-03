'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

const COLORS = ['#2563eb', '#93c5fd']

export function formatPatientsTooltip(value: any): [any, string] {
  return [value, '']
}

interface PatientsChartCardProps {
  patients: IDashboardModel['patients']
}

export function PatientsChartCard({ patients }: PatientsChartCardProps) {
  const data = [
    { name: 'Novos', value: patients.newPatients },
    { name: 'Recorrentes', value: patients.returningPatients },
  ]

  const hasData = patients.total > 0

  return (
    <div data-testid="dashboard-patients-chart" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Pacientes</span>

      {hasData ? (
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
            <Tooltip formatter={formatPatientsTooltip} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[140px] items-center justify-center text-sm text-text-mute">
          Sem dados no período
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-text-dim">Novos</span>
          <span className="font-semibold text-text">{patients.newPatients}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[1] }} />
          <span className="text-text-dim">Recorrentes</span>
          <span className="font-semibold text-text">{patients.returningPatients}</span>
        </span>
      </div>

      <div className="flex gap-4 border-t border-line pt-2 text-xs text-text-dim">
        <span>♂ Homens <strong className="text-text">{patients.byGender.male}</strong></span>
        <span>♀ Mulheres <strong className="text-text">{patients.byGender.female}</strong></span>
        <span className="ml-auto">Total <strong className="text-text">{patients.total}</strong></span>
      </div>
    </div>
  )
}
