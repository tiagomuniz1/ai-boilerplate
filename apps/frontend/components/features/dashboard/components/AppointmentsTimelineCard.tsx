'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

interface AppointmentsTimelineCardProps {
  appointmentsByDay: IDashboardModel['appointmentsByDay']
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatTimelineTooltip(value: any): [any, string] {
  return [value, 'atendimentos']
}

export function AppointmentsTimelineCard({ appointmentsByDay }: AppointmentsTimelineCardProps) {
  const data = appointmentsByDay.map((d) => ({
    date: formatDate(d.date),
    count: d.count,
  }))

  const hasData = data.some((d) => d.count > 0)

  const tickInterval = Math.max(1, Math.floor(data.length / 7))

  return (
    <div data-testid="dashboard-timeline-chart" className="rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Atendimentos no período</span>

      <div className="mt-4">
        {hasData || data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={tickInterval} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip formatter={formatTimelineTooltip} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorCount)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-sm text-text-mute">
            Sem atendimentos no período
          </div>
        )}
      </div>
    </div>
  )
}
