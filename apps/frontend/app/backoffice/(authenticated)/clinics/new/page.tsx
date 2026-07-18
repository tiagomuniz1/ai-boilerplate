'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { ClinicForm } from '@/components/features/clinics/components/clinic-form'
import { useCreateClinic } from '@/components/features/clinics/hooks/use-create-clinic.hook'
import { useBasePath } from '@/lib/slug-context'
import type { ICreateClinicInput } from '@/components/features/clinics/types/clinic.types'
import type { IApiError } from '@/types/api.types'

export default function NewClinicPage() {
  const basePath = useBasePath()
  const { mutate, isPending } = useCreateClinic()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateClinicInput,
    setError: (field: keyof ICreateClinicInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateClinicInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('Slug já está em uso. Escolha outro slug ou deixe em branco para gerar automaticamente.')
        } else {
          setGlobalError('Não foi possível criar a clínica. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="max-w-lg p-6" data-testid="new-clinic-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`${basePath}/clinics`}>
          <Button variant="ghost" size="sm" data-testid="new-clinic-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Nova clínica</Typography>
      </div>
      <ClinicForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
