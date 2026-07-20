'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useIsMobile } from '@/hooks/use-is-mobile.hook'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
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

function parseDate(str: string | null): Date {
  if (!str) return new Date()
  const d = new Date(`${str}T00:00:00`)
  return isNaN(d.getTime()) ? new Date() : d
}

export function AppointmentAgenda() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? UserRole.USER
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentDate, setCurrentDate] = useState<Date>(() => parseDate(searchParams.get('date')))
  const [view, setView] = useState<AgendaView>(() => {
    const v = searchParams.get('view')
    return v === 'day' ? 'day' : 'week'
  })
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(
    () => searchParams.get('doctor'),
  )
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)

  // Week view crams 7 columns of time slots into the viewport — illegible on
  // mobile without horizontal scroll. Force day view there regardless of the
  // persisted/URL view, and hide the toggle in AgendaToolbar to match.
  const isMobile = useIsMobile()
  const effectiveView: AgendaView = isMobile ? 'day' : view

  const isDoctor = role === UserRole.PROFESSIONAL
  const showDoctorSelector = role === UserRole.ADMIN || role === UserRole.USER

  const { data: doctors } = useProfessionals({ limit: 100 })

  const currentDoctorId = isDoctor ? doctors?.[0]?.id : undefined

  const doctorIdForGrid: string | null = isDoctor ? 'self' : selectedDoctorId

  const effectiveDoctorId: string | undefined = isDoctor
    ? undefined
    : selectedDoctorId ?? undefined

  const dateString = toDateString(currentDate)
  const weekStart = toDateString(getWeekStart(currentDate))

  const syncUrl = useCallback(
    (date: Date, v: AgendaView, doctorId: string | null) => {
      const params = new URLSearchParams()
      params.set('date', toDateString(date))
      params.set('view', v)
      if (doctorId) params.set('doctor', doctorId)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  function handleDateChange(date: Date) {
    setCurrentDate(date)
    syncUrl(date, view, selectedDoctorId)
  }

  function handleViewChange(v: AgendaView) {
    setView(v)
    syncUrl(currentDate, v, selectedDoctorId)
  }

  function handleDoctorChange(doctorId: string | null) {
    setSelectedDoctorId(doctorId)
    syncUrl(currentDate, view, doctorId)
  }

  return (
    <div data-testid="appointment-agenda">
      <AgendaToolbar
        currentDate={currentDate}
        view={effectiveView}
        onDateChange={handleDateChange}
        onViewChange={handleViewChange}
        role={role}
        doctors={showDoctorSelector ? (doctors ?? []) : undefined}
        selectedDoctorId={selectedDoctorId}
        onDoctorChange={handleDoctorChange}
        onBlockTime={() => setIsBlockDialogOpen(true)}
      />

      {effectiveView === 'day' ? (
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
