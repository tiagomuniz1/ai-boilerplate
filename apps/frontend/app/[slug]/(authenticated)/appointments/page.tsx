import { Suspense } from 'react'
import { AppointmentAgenda } from '@/components/features/appointments/components/appointment-agenda'

export default function AppointmentsPage() {
  return (
    <main className="p-8" data-testid="appointments-page">
      <h1 className="text-2xl font-semibold mb-6">Consultas</h1>
      <Suspense>
        <AppointmentAgenda />
      </Suspense>
    </main>
  )
}
