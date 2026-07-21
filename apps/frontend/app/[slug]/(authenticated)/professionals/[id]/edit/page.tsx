'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { ProfessionalForm } from '@/components/features/professionals/components/professional-form'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { useUpdateProfessional } from '@/components/features/professionals/hooks/use-update-professional.hook'
import type { IUpdateProfessionalInput } from '@/components/features/professionals/types/professional-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditProfessionalPage() {
  const { id } = useParams<{ id: string }>()
  const basePath = useBasePath()
  const { data: professional, isPending: isLoadingProfessional, isError: isLoadError } = useProfessional(id)
  const { mutate: updateProfessional, isPending: isUpdating } = useUpdateProfessional()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateProfessionalInput,
    setError: (field: keyof IUpdateProfessionalInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateProfessional(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdateProfessionalInput, { message })
            })
          } else if (error.status === 409) {
            setGlobalError('Registro já cadastrado por outro profissional.')
          } else if (error.status === 404) {
            setGlobalError('Profissional não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o profissional. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-professional-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={id ? `${basePath}/professionals/${id}` : `${basePath}/professionals`}>
          <Button variant="ghost" size="sm" data-testid="edit-professional-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar profissional</Typography>
      </div>

      {isLoadingProfessional && (
        <div className="flex flex-col gap-4" data-testid="edit-professional-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={80} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-professional-load-error">
          Não foi possível carregar os dados do profissional. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingProfessional && !isLoadError && professional && (
        <ProfessionalForm
          mode="edit"
          defaultValues={professional}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
