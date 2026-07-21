'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { ProfessionalDetails } from '@/components/features/professionals/components/professional-details'
import { ProfessionalDeleteDialog } from '@/components/features/professionals/components/professional-delete-dialog'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { useDeleteProfessional } from '@/components/features/professionals/hooks/use-delete-professional.hook'

export default function ProfessionalDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const basePath = useBasePath()
  const { data: professional, isPending, isError } = useProfessional(id)
  const { mutate: deleteProfessional, isPending: isDeleting } = useDeleteProfessional()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  function handleDeleteConfirm() {
    deleteProfessional(id, {
      onSuccess: () => {
        router.push(`${basePath}/professionals`)
      },
      onError: () => {
        setShowDeleteDialog(false)
      },
    })
  }

  return (
    <main className="p-6 max-w-2xl" data-testid="professional-details-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/professionals`}>
          <Button variant="ghost" size="sm" data-testid="professional-details-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex flex-col gap-4" data-testid="professional-details-skeleton">
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
        <Alert variant="error" data-testid="professional-details-error">
          Não foi possível carregar os dados do profissional. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && professional && (
        <ProfessionalDetails professional={professional} onDeleteClick={() => setShowDeleteDialog(true)} />
      )}

      <ProfessionalDeleteDialog
        professional={professional ?? null}
        isOpen={showDeleteDialog}
        isPending={isDeleting}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </main>
  )
}
