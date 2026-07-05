import { ScheduleList } from '@/components/features/schedules/components/schedule-list'

export default function SchedulesPage() {
  return (
    <main className="p-6 sm:p-8" data-testid="schedules-page">
      <ScheduleList />
    </main>
  )
}
