'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { useSchedule } from '@/components/features/schedules/hooks/use-schedule.hook'
import { useUpdateSchedule } from '@/components/features/schedules/hooks/use-update-schedule.hook'
import { ScheduleForm } from '@/components/features/schedules/components/schedule-form'
import type { IUpdateScheduleInput } from '@/components/features/schedules/types/schedule-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditSchedulePage() {
  const { id } = useParams<{ id: string }>()
  const { data: schedule, isPending, isError } = useSchedule(id)
  const { mutate: updateSchedule, isPending: isUpdating } = useUpdateSchedule()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateScheduleInput,
    setError: (field: string, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateSchedule(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 409) {
            setGlobalError('Esta agenda conflita com outra já existente para este médico.')
          } else if (error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field, { message })
            })
          } else {
            setGlobalError('Ocorreu um erro ao atualizar a agenda. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="edit-schedule-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/schedules/${id}`}>
          <Button variant="ghost" size="sm" data-testid="edit-schedule-back-button">
            ← Voltar
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-text">Editar agenda</h1>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="edit-schedule-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="edit-schedule-error">
          Não foi possível carregar os dados da agenda. Tente novamente.
        </Alert>
      )}

      {!isPending && !isError && schedule && (
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm p-6">
          <ScheduleForm
            mode="edit"
            defaultValues={schedule}
            isPending={isUpdating}
            globalError={globalError}
            onSubmit={handleSubmit}
          />
        </div>
      )}
    </main>
  )
}
