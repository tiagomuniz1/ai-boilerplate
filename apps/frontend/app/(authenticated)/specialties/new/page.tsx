'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { SpecialtyForm } from '@/components/features/specialties/components/specialty-form'
import { useCreateSpecialty } from '@/components/features/specialties/hooks/use-create-specialty.hook'
import type { ICreateSpecialtyInput } from '@/components/features/specialties/types/specialty-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewSpecialtyPage() {
  const { mutate, isPending } = useCreateSpecialty()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateSpecialtyInput,
    setError: (field: keyof ICreateSpecialtyInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateSpecialtyInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('Já existe uma especialidade com este nome.')
        } else {
          setGlobalError('Não foi possível criar a especialidade. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-specialty-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/specialties">
          <Button variant="ghost" size="sm" data-testid="new-specialty-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Nova especialidade</Typography>
      </div>
      <SpecialtyForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
