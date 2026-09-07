'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { VaccineForm, type VaccineFormValues } from '@/components/features/vaccines/components/vaccine-form'
import { useVaccine } from '@/components/features/vaccines/hooks/use-vaccine.hook'
import { useUpdateVaccine } from '@/components/features/vaccines/hooks/use-update-vaccine.hook'
import type { IApiError } from '@/types/api.types'

export default function EditVaccinePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: vaccine, isPending, isError } = useVaccine(id)
  const { mutate, isPending: isUpdating } = useUpdateVaccine()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    values: VaccineFormValues,
    setError: (field: keyof VaccineFormValues, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(
      { id, data: values },
      {
        onSuccess: () => router.push('/backoffice/vaccines'),
        onError: (error) => {
          const apiError = error as unknown as IApiError
          if (apiError.status === 409) {
            setError('name', { message: 'Já existe uma vacina com esse nome' })
            return
          }
          setGlobalError(apiError.detail ?? 'Erro ao salvar a vacina. Tente novamente.')
        },
      },
    )
  }

  return (
    <main className="p-6 sm:p-8" data-testid="edit-vaccine-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/backoffice/vaccines">
          <Button variant="ghost" size="sm" data-testid="edit-vaccine-back-button">
            ← Voltar
          </Button>
        </Link>
      </div>

      {isPending && (
        <div className="flex max-w-xl flex-col gap-4" data-testid="edit-vaccine-skeleton">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} height={44} className="w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="edit-vaccine-error">
          Não foi possível carregar a vacina. Verifique o endereço e tente novamente.
        </Alert>
      )}

      {!isPending && !isError && vaccine && (
        <>
          <Typography variant="h2" className="mb-6">
            {vaccine.name}
          </Typography>
          <VaccineForm
            mode="edit"
            initialData={vaccine}
            isPending={isUpdating}
            globalError={globalError}
            onSubmit={handleSubmit}
          />
        </>
      )}
    </main>
  )
}
