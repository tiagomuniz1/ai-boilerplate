'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSlug } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { DoctorForm } from '@/components/features/doctors/components/doctor-form'
import { useDoctor } from '@/components/features/doctors/hooks/use-doctor.hook'
import { useUpdateDoctor } from '@/components/features/doctors/hooks/use-update-doctor.hook'
import type { IUpdateDoctorInput } from '@/components/features/doctors/types/doctor-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditDoctorPage() {
  const { id } = useParams<{ id: string }>()
  const slug = useSlug()
  const { data: doctor, isPending: isLoadingDoctor, isError: isLoadError } = useDoctor(id)
  const { mutate: updateDoctor, isPending: isUpdating } = useUpdateDoctor()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateDoctorInput,
    setError: (field: keyof IUpdateDoctorInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateDoctor(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdateDoctorInput, { message })
            })
          } else if (error.status === 409) {
            setGlobalError('CRM já cadastrado por outro médico.')
          } else if (error.status === 404) {
            setGlobalError('Médico não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o médico. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-doctor-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={id ? `/${slug}/doctors/${id}` : `/${slug}/doctors`}>
          <Button variant="ghost" size="sm" data-testid="edit-doctor-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar médico</Typography>
      </div>

      {isLoadingDoctor && (
        <div className="flex flex-col gap-4" data-testid="edit-doctor-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={80} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-doctor-load-error">
          Não foi possível carregar os dados do médico. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingDoctor && !isLoadError && doctor && (
        <DoctorForm
          mode="edit"
          defaultValues={doctor}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
