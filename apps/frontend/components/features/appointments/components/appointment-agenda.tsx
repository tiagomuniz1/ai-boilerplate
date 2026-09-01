'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { useIsMobile } from '@/hooks/use-is-mobile.hook'
import { useProfessionals } from '@/components/features/professionals/hooks/use-professionals.hook'
import { useMyProfessional } from '@/components/features/professionals/hooks/use-my-professional.hook'
import { BlockTimeDialog } from '@/components/features/schedule-exceptions/components/BlockTimeDialog'
import { getWeekStart, toLocalDateString } from '@/lib/format-date'
import { AgendaToolbar } from './agenda-toolbar'
import { AgendaDayGrid } from './agenda-day-grid'
import { AgendaWeekGrid } from './agenda-week-grid'

type AgendaView = 'day' | 'week'

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

  const isProfessional = role === UserRole.PROFESSIONAL
  const showDoctorSelector = role === UserRole.ADMIN || role === UserRole.USER

  const { data: doctors } = useProfessionals({ limit: 100 })
  const { data: myProfessional } = useMyProfessional()

  const currentDoctorId = myProfessional?.id

  // Quem também atende cai na própria agenda. Sem isto, um ADMIN com ficha
  // abriria a tela vazia e teria que se escolher no seletor toda manhã. Só vale
  // como ponto de partida: qualquer escolha do usuário, inclusive via ?doctor=,
  // tem precedência.
  useEffect(() => {
    if (!showDoctorSelector) return
    if (searchParams.get('doctor') || selectedDoctorId) return
    if (!myProfessional?.id) return
    setSelectedDoctorId(myProfessional.id)
  }, [showDoctorSelector, searchParams, selectedDoctorId, myProfessional?.id])

  const professionalIdForGrid: string | null = isProfessional ? 'self' : selectedDoctorId

  const effectiveDoctorId: string | undefined = isProfessional
    ? undefined
    : selectedDoctorId ?? undefined

  const dateString = toLocalDateString(currentDate)
  const weekStart = toLocalDateString(getWeekStart(currentDate))

  const syncUrl = useCallback(
    (date: Date, v: AgendaView, professionalId: string | null) => {
      const params = new URLSearchParams()
      params.set('date', toLocalDateString(date))
      params.set('view', v)
      if (professionalId) params.set('doctor', professionalId)
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

  function handleDoctorChange(professionalId: string | null) {
    setSelectedDoctorId(professionalId)
    syncUrl(currentDate, view, professionalId)
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
          professionalId={professionalIdForGrid}
          date={dateString}
          role={role}
          currentDoctorId={currentDoctorId}
          effectiveDoctorId={effectiveDoctorId}
        />
      ) : (
        <AgendaWeekGrid
          professionalId={professionalIdForGrid}
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
        professionalId={effectiveDoctorId}
      />
    </div>
  )
}
