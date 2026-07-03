'use client'

import { useState } from 'react'
import { useDashboardStats } from './hooks/use-dashboard-stats.hook'
import { DashboardSkeleton } from './components/DashboardSkeleton'
import { DashboardKpiRow } from './components/DashboardKpiRow'
import { PatientsChartCard } from './components/PatientsChartCard'
import { ProceduresChartCard } from './components/ProceduresChartCard'
import { InsuranceChartCard } from './components/InsuranceChartCard'
import { CidRankingCard } from './components/CidRankingCard'
import { AppointmentsTimelineCard } from './components/AppointmentsTimelineCard'
import { AgeDistributionCard } from './components/AgeDistributionCard'
import { BirthdayPanel } from './components/BirthdayPanel'
import { DashboardDateRangeFilter } from './components/DashboardDateRangeFilter'
import type { IDashboardFilters } from './types/dashboard.types'

function defaultDates(): { from: string; to: string } {
  const today = new Date()
  const from = new Date(today)
  from.setUTCDate(from.getUTCDate() - 29)
  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  }
}

export function DashboardView() {
  const defaults = defaultDates()
  const [filters, setFilters] = useState<IDashboardFilters>({
    from: defaults.from,
    to: defaults.to,
  })

  const { data, isLoading, isError } = useDashboardStats(filters)

  const handleDateChange = (from: string, to: string) => {
    if (from && to) {
      setFilters((prev) => ({ ...prev, from, to }))
    }
  }

  return (
    <main data-testid="dashboard" className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <DashboardDateRangeFilter
          // filters.from/to are always set by the initial state above and only ever
          // overwritten together by handleDateChange when both are truthy.
          from={filters.from!}
          to={filters.to!}
          onChange={handleDateChange}
        />
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && !isLoading && (
        <div data-testid="dashboard-error" className="rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger">
          Não foi possível carregar os dados do dashboard. Tente novamente.
        </div>
      )}

      {data && !isLoading && (
        <div className="flex flex-col gap-6">
          <DashboardKpiRow kpi={data.kpi} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <PatientsChartCard patients={data.patients} />
            <ProceduresChartCard procedures={data.procedures} />
            <InsuranceChartCard insurance={data.insurance} />
            <CidRankingCard cidRanking={data.cidRanking} />
            <BirthdayPanel todayBirthdays={data.todayBirthdays} />
          </div>

          <AppointmentsTimelineCard appointmentsByDay={data.appointmentsByDay} />

          <AgeDistributionCard ageDistribution={data.ageDistribution} />
        </div>
      )}
    </main>
  )
}
