'use client'

import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { useDoctors } from '@/components/features/doctors/hooks/use-doctors.hook'
import { useCreateSchedule } from '@/components/features/schedules/hooks/use-create-schedule.hook'
import { ScheduleForm } from '@/components/features/schedules/components/schedule-form'
import type { ICreateScheduleInput } from '@/components/features/schedules/types/schedule-input.types'
import type { IApiError } from '@/types/api.types'
import { useState } from 'react'

export default function NewSchedulePage() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === UserRole.ADMIN
  const [globalError, setGlobalError] = useState<string | null>(null)

  const slug = useSlug()
  const { mutate: createSchedule, isPending } = useCreateSchedule()
  const { data: doctorsList } = useDoctors({ limit: 100 })
  const doctors = doctorsList ?? []

  function handleSubmit(
    data: ICreateScheduleInput,
    setError: (field: string, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    createSchedule(data, {
      onError: (error: IApiError) => {
        if (error.status === 409) {
          setGlobalError('Esta agenda conflita com outra já existente para este médico.')
        } else if (error.status === 404) {
          setGlobalError('Médico não encontrado. Verifique se o perfil está cadastrado.')
        } else if (error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field, { message })
          })
        } else {
          setGlobalError('Ocorreu um erro ao criar a agenda. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="new-schedule-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${slug}/schedules`}>
          <Button variant="ghost" size="sm" data-testid="new-schedule-back-button">
            ← Voltar
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-text">Nova agenda</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm p-6">
        <ScheduleForm
          mode="create"
          role={user?.role ?? UserRole.DOCTOR}
          doctors={isAdmin ? doctors : undefined}
          isPending={isPending}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  )
}
