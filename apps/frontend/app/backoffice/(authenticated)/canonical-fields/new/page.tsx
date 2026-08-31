'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { CanonicalFieldForm } from '@/components/features/canonical-fields/components/canonical-field-form'
import { useCreateCanonicalField } from '@/components/features/canonical-fields/hooks/use-create-canonical-field.hook'
import type { ICreateCanonicalFieldInput } from '@/components/features/canonical-fields/types/canonical-field-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewCanonicalFieldPage() {
  const basePath = useBasePath()
  const { mutate, isPending } = useCreateCanonicalField()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateCanonicalFieldInput,
    setError: (field: keyof ICreateCanonicalFieldInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateCanonicalFieldInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('Já existe um campo com esta chave canônica.')
        } else {
          setGlobalError('Não foi possível criar o campo. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-canonical-field-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/canonical-fields`}>
          <Button variant="ghost" size="sm" data-testid="new-canonical-field-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo campo canônico</Typography>
      </div>
      <CanonicalFieldForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
