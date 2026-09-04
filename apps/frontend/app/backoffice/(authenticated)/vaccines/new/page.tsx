'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { VaccineForm, type VaccineFormValues } from '@/components/features/vaccines/components/vaccine-form'
import { useCreateVaccine } from '@/components/features/vaccines/hooks/use-create-vaccine.hook'
import type { IApiError } from '@/types/api.types'

export default function NewVaccinePage() {
  const router = useRouter()
  const { mutate, isPending } = useCreateVaccine()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    values: VaccineFormValues,
    setError: (field: keyof VaccineFormValues, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(values, {
      onSuccess: () => router.push('/backoffice/vaccines'),
      onError: (error) => {
        const apiError = error as unknown as IApiError
        if (apiError.status === 409) {
          setError('name', { message: 'Já existe uma vacina com esse nome' })
          return
        }
        if (apiError.status === 422 && apiError.errors) {
          apiError.errors.forEach(({ field, message }) =>
            setError(field as keyof VaccineFormValues, { message }),
          )
          return
        }
        setGlobalError(apiError.detail ?? 'Erro ao criar a vacina. Tente novamente.')
      },
    })
  }

  return (
    <main className="p-6 sm:p-8" data-testid="new-vaccine-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/backoffice/vaccines">
          <Button variant="ghost" size="sm" data-testid="new-vaccine-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>
      <Typography variant="h2" className="mb-6">
        Nova vacina
      </Typography>
      <VaccineForm mode="create" isPending={isPending} globalError={globalError} onSubmit={handleSubmit} />
    </main>
  )
}
