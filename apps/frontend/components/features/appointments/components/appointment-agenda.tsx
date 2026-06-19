'use client'

import { useState } from 'react'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useDoctors } from '@/components/features/doctors/hooks/use-doctors.hook'
import { BlockTimeDialog } from '@/components/features/schedule-exceptions/components/BlockTimeDialog'
import { AgendaToolbar } from './agenda-toolbar'
import { AgendaDayGrid } from './agenda-day-grid'
import { AgendaWeekGrid } from './agenda-week-grid'

type AgendaView = 'day' | 'week'

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

export function AppointmentAgenda() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? UserRole.USER

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [view, setView] = useState<AgendaView>('week')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)

  const isDoctor = role === UserRole.DOCTOR
  const showDoctorSelector = role === UserRole.ADMIN || role === UserRole.USER

  const { data: doctors } = useDoctors({ limit: 100 })

  const currentDoctorId = isDoctor ? doctors?.[0]?.id : undefined

  const doctorIdForGrid: string | null = isDoctor
    ? 'self'
    : selectedDoctorId

  const effectiveDoctorId: string | undefined = isDoctor
    ? undefined
    : selectedDoctorId ?? undefined

  const dateString = toDateString(currentDate)
  const weekStart = toDateString(getWeekStart(currentDate))

  return (
    <div data-testid="appointment-agenda">
      <AgendaToolbar
        currentDate={currentDate}
        view={view}
        onDateChange={setCurrentDate}
        onViewChange={setView}
        role={role}
        doctors={showDoctorSelector ? (doctors ?? []) : undefined}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={setSelectedDoctorId}
        onBlockTime={() => setIsBlockDialogOpen(true)}
      />

      {view === 'day' ? (
        <AgendaDayGrid
          doctorId={doctorIdForGrid}
          date={dateString}
          role={role}
          currentDoctorId={currentDoctorId}
          effectiveDoctorId={effectiveDoctorId}
        />
      ) : (
        <AgendaWeekGrid
          doctorId={doctorIdForGrid}
          startDate={weekStart}
          role={role}
          currentDoctorId={currentDoctorId}
          effectiveDoctorId={effectiveDoctorId}
        />
      )}

      <BlockTimeDialog
        isOpen={isBlockDialogOpen}
        onClose={() => setIsBlockDialogOpen(false)}
        date={dateString}
        role={role}
        doctorId={effectiveDoctorId}
      />
    </div>
  )
}
