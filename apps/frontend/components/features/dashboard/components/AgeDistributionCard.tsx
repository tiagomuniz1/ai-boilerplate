'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { IDashboardModel } from '../types/dashboard.types'

interface AgeDistributionCardProps {
  ageDistribution: IDashboardModel['ageDistribution']
}

export function AgeDistributionCard({ ageDistribution }: AgeDistributionCardProps) {
  const hasData = ageDistribution.length > 0

  return (
    <div data-testid="dashboard-age-distribution" className="rounded-lg border border-line bg-surface p-4">
      <span className="text-sm font-semibold text-text">Distribuição etária</span>

      <div className="mt-4">
        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={ageDistribution} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAge" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip formatter={(val) => [val, 'pacientes']} labelFormatter={(l) => `${l} anos`} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#colorAge)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[180px] items-center justify-center text-sm text-text-mute">
            Sem dados de distribuição etária
          </div>
        )}
      </div>
    </div>
  )
}
