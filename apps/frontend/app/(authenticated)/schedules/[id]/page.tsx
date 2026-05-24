'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { useAuthStore } from '@/stores/auth.store'
import { ScheduleDetails } from '@/components/features/schedules/components/schedule-details'
import { ScheduleDeleteDialog } from '@/components/features/schedules/components/schedule-delete-dialog'
import { useSchedule } from '@/components/features/schedules/hooks/use-schedule.hook'
import { useDeleteSchedule } from '@/components/features/schedules/hooks/use-delete-schedule.hook'
import type { IApiError } from '@/types/api.types'

export default function ScheduleDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const canManageSchedules = user?.role === UserRole.ADMIN || user?.role === UserRole.DOCTOR
  const { data: schedule, isPending, isError, error } = useSchedule(id)
  const { mutate: deleteSchedule, isPending: isDeleting } = useDeleteSchedule()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const apiError = error as IApiError | null
  const isForbidden = apiError?.status === 403
  const isNotFound = apiError?.status === 404

  function handleDeleteConfirm() {
    deleteSchedule(id, {
      onSuccess: () => {
        router.push('/schedules')
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="schedule-details-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/schedules">
          <Button variant="ghost" size="sm" data-testid="schedule-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="schedule-details-skeleton">
          <Skeleton height={32} className="w-64" />
          <Skeleton height={16} className="w-48" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={40} className="w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && isForbidden && (
        <Alert variant="error" data-testid="schedule-details-forbidden">
          Você não tem permissão para acessar esta agenda.
        </Alert>
      )}

      {isError && isNotFound && (
        <Alert variant="error" data-testid="schedule-details-not-found">
          Agenda não encontrada.
        </Alert>
      )}

      {isError && !isForbidden && !isNotFound && (
        <Alert variant="error" data-testid="schedule-details-error">
          Não foi possível carregar os dados da agenda. Tente novamente.
        </Alert>
      )}

      {!isPending && !isError && schedule && (
        <ScheduleDetails schedule={schedule} canManageSchedules={canManageSchedules} onDeleteClick={() => setShowDeleteDialog(true)} />
      )}

      <ScheduleDeleteDialog
        schedule={schedule ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
