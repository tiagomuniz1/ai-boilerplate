'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSlug } from '@/lib/slug-context'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { DoctorDetails } from '@/components/features/doctors/components/doctor-details'
import { DoctorDeleteDialog } from '@/components/features/doctors/components/doctor-delete-dialog'
import { useDoctor } from '@/components/features/doctors/hooks/use-doctor.hook'
import { useDeleteDoctor } from '@/components/features/doctors/hooks/use-delete-doctor.hook'

export default function DoctorDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const slug = useSlug()
  const { data: doctor, isPending, isError } = useDoctor(id)
  const { mutate: deleteDoctor, isPending: isDeleting } = useDeleteDoctor()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function handleDeleteConfirm() {
    deleteDoctor(id, {
      onSuccess: () => {
        router.push(`/${slug}/doctors`)
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="doctor-details-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${slug}/doctors`}>
          <Button variant="ghost" size="sm" data-testid="doctor-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="doctor-details-skeleton">
          <Skeleton height={32} className="w-64" />
          <Skeleton height={16} className="w-48" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={40} className="w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="doctor-details-error">
          Não foi possível carregar os dados do médico. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && doctor && (
        <DoctorDetails doctor={doctor} onDeleteClick={() => setShowDeleteDialog(true)} />
      )}

      <DoctorDeleteDialog
        doctor={doctor ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
