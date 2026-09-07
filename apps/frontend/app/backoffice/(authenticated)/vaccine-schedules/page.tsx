import { ScheduleRuleList } from '@/components/features/vaccine-schedules/components/schedule-rule-list'

export default function VaccineSchedulesPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="vaccine-schedules-page">
      <ScheduleRuleList />
    </main>
  )
}
