'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { PatientForm } from '@/components/features/patients/components/patient-form'
import { usePatient } from '@/components/features/patients/hooks/use-patient.hook'
import { useUpdatePatient } from '@/components/features/patients/hooks/use-update-patient.hook'
import type { IUpdatePatientInput } from '@/components/features/patients/types/patient-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditPatientPage() {
  const { id } = useParams<{ id: string }>()
  const basePath = useBasePath()
  const { data: patient, isPending: isLoadingPatient, isError: isLoadError } = usePatient(id)
  const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdatePatientInput,
    setError: (field: keyof IUpdatePatientInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updatePatient(
      { id, data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdatePatientInput, { message })
            })
          } else if (error.status === 409) {
            setGlobalError('E-mail ou documento já cadastrado. Verifique os dados e tente novamente.')
          } else if (error.status === 404) {
            setGlobalError('Paciente não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o paciente. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-patient-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={id ? `${basePath}/patients/${id}` : `${basePath}/patients`}>
          <Button variant="ghost" size="sm" data-testid="edit-patient-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar paciente</Typography>
      </div>

      {isLoadingPatient && (
        <div className="flex flex-col gap-4" data-testid="edit-patient-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-patient-load-error">
          Não foi possível carregar os dados do paciente. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingPatient && !isLoadError && patient && (
        <PatientForm
          mode="edit"
          defaultValues={patient}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
