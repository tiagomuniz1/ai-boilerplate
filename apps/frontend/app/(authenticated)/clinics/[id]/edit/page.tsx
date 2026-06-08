'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { ClinicForm } from '@/components/features/clinics/components/clinic-form'
import { ClinicDetailsSkeleton } from '@/components/features/clinics/components/clinic-details-skeleton'
import { useClinic } from '@/components/features/clinics/hooks/use-clinic.hook'
import { useUpdateClinic } from '@/components/features/clinics/hooks/use-update-clinic.hook'
import type { IUpdateClinicInput } from '@/components/features/clinics/types/clinic.types'
import type { IApiError } from '@/types/api.types'

export default function EditClinicPage() {
  const { id } = useParams<{ id: string }>()
  const { data: clinic, isPending: isLoadingClinic, isError: isLoadError } = useClinic(id)
  const { mutate: updateClinic, isPending: isUpdating } = useUpdateClinic()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateClinicInput,
    setError: (field: keyof IUpdateClinicInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateClinic(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdateClinicInput, { message })
            })
          } else if (error.status === 409) {
            setGlobalError('Slug já está em uso por outra clínica.')
          } else if (error.status === 404) {
            setGlobalError('Clínica não encontrada.')
          } else {
            setGlobalError('Não foi possível atualizar a clínica. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="max-w-lg p-6" data-testid="edit-clinic-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href={id ? `/clinics/${id}` : '/clinics'}>
          <Button variant="ghost" size="sm" data-testid="edit-clinic-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar clínica</Typography>
      </div>

      {isLoadingClinic && <ClinicDetailsSkeleton />}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-clinic-load-error">
          Não foi possível carregar os dados da clínica. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingClinic && !isLoadError && clinic && (
        <ClinicForm
          mode="edit"
          defaultValues={clinic}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
