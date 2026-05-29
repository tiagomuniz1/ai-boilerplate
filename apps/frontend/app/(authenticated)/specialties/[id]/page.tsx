'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { SpecialtyDetails } from '@/components/features/specialties/components/specialty-details'
import { SpecialtyDeleteDialog } from '@/components/features/specialties/components/specialty-delete-dialog'
import { useSpecialty } from '@/components/features/specialties/hooks/use-specialty.hook'
import { useDeleteSpecialty } from '@/components/features/specialties/hooks/use-delete-specialty.hook'

export default function SpecialtyDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: specialty, isPending, isError } = useSpecialty(id)
  const { mutate: deleteSpecialty, isPending: isDeleting } = useDeleteSpecialty()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function handleDeleteConfirm() {
    deleteSpecialty(id, {
      onSuccess: () => {
        router.push('/specialties')
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="specialty-details-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/specialties">
          <Button variant="ghost" size="sm" data-testid="specialty-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="specialty-details-skeleton">
          <Skeleton height={32} className="w-64" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={40} className="w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="specialty-details-error">
          Não foi possível carregar os dados da especialidade. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && specialty && (
        <SpecialtyDetails specialty={specialty} onDeleteClick={() => setShowDeleteDialog(true)} />
      )}

      <SpecialtyDeleteDialog
        specialty={specialty ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
