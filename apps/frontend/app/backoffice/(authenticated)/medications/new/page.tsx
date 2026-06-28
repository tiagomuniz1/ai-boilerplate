'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { MedicationForm } from '@/components/features/medications/components/medication-form'
import { useCreateMedication } from '@/components/features/medications/hooks/use-create-medication.hook'
import type { ICreateMedicationInput } from '@/components/features/medications/types/medication-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewMedicationPage() {
  const slug = useSlug()
  const { mutate, isPending } = useCreateMedication()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateMedicationInput,
    setError: (field: keyof ICreateMedicationInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateMedicationInput, { message })
          })
        } else {
          setGlobalError('Não foi possível criar o medicamento. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-medication-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${slug}/medications`}>
          <Button variant="ghost" size="sm" data-testid="new-medication-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo medicamento</Typography>
      </div>
      <MedicationForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
