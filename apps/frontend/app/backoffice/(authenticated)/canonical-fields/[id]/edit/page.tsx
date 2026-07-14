'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { CanonicalFieldForm } from '@/components/features/canonical-fields/components/canonical-field-form'
import { useCanonicalFieldAdmin } from '@/components/features/canonical-fields/hooks/use-canonical-field-admin.hook'
import { useUpdateCanonicalField } from '@/components/features/canonical-fields/hooks/use-update-canonical-field.hook'
import type { IUpdateCanonicalFieldInput } from '@/components/features/canonical-fields/types/canonical-field-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditCanonicalFieldPage() {
  const { id } = useParams<{ id: string }>()
  const basePath = useBasePath()
  const { data: field, isPending: isLoadingField, isError: isLoadError } = useCanonicalFieldAdmin(id)
  const { mutate: updateField, isPending: isUpdating } = useUpdateCanonicalField()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateCanonicalFieldInput,
    setError: (field: keyof IUpdateCanonicalFieldInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateField(
      { id, data },
      {
        onSuccess: () => {
          setGlobalError(null)
        },
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field: f, message }) => {
              setError(f as keyof IUpdateCanonicalFieldInput, { message })
            })
          } else if (error.status === 404) {
            setGlobalError('Campo não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o campo. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-canonical-field-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/canonical-fields`}>
          <Button variant="ghost" size="sm" data-testid="edit-canonical-field-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar campo canônico</Typography>
      </div>

      {isLoadingField && (
        <div className="flex flex-col gap-4" data-testid="edit-canonical-field-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-canonical-field-load-error">
          Não foi possível carregar os dados do campo. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingField && !isLoadError && field && (
        <CanonicalFieldForm
          mode="edit"
          defaultValues={field}
          specialties={[]}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
