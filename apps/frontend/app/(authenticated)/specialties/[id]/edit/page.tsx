'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { SpecialtyForm } from '@/components/features/specialties/components/specialty-form'
import { useSpecialty } from '@/components/features/specialties/hooks/use-specialty.hook'
import { useUpdateSpecialty } from '@/components/features/specialties/hooks/use-update-specialty.hook'
import type { IUpdateSpecialtyInput } from '@/components/features/specialties/types/specialty-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditSpecialtyPage() {
  const { id } = useParams<{ id: string }>()
  const { data: specialty, isPending: isLoadingSpecialty, isError: isLoadError } = useSpecialty(id)
  const { mutate: updateSpecialty, isPending: isUpdating } = useUpdateSpecialty()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateSpecialtyInput,
    setError: (field: keyof IUpdateSpecialtyInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateSpecialty(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdateSpecialtyInput, { message })
            })
          } else if (error.status === 409) {
            setGlobalError('Já existe uma especialidade com este nome.')
          } else if (error.status === 404) {
            setGlobalError('Especialidade não encontrada.')
          } else {
            setGlobalError('Não foi possível atualizar a especialidade. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-specialty-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={id ? `/specialties/${id}` : '/specialties'}>
          <Button variant="ghost" size="sm" data-testid="edit-specialty-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar especialidade</Typography>
      </div>

      {isLoadingSpecialty && (
        <div className="flex flex-col gap-4" data-testid="edit-specialty-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={80} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-specialty-load-error">
          Não foi possível carregar os dados da especialidade. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingSpecialty && !isLoadError && specialty && (
        <SpecialtyForm
          mode="edit"
          defaultValues={specialty}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
