'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

interface DurationCardProps {
  duration: IDashboardModel['duration']
}

export function DurationCard({ duration }: DurationCardProps) {
  const barData = [
    { label: 'Particular', value: duration.byInsuranceType.particular },
    { label: 'Convênio', value: duration.byInsuranceType.convenio },
  ]

  const COLORS = ['#2563eb', '#7c3aed']

  return (
    <div data-testid="dashboard-duration-card" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Duração do atendimento</span>

      <div className="text-3xl font-bold text-text">
        {duration.averageMinutes > 0 ? `${duration.averageMinutes}min` : '—'}
      </div>
      <span className="text-xs text-text-dim">Duração média</span>

      <div className="mt-1">
        <span className="text-xs font-medium text-text-dim">Tipo de atendimento</span>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={barData} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(val) => [val, 'consultas']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
