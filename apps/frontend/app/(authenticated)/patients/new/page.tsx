'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { PatientForm } from '@/components/features/patients/components/patient-form'
import { useCreatePatient } from '@/components/features/patients/hooks/use-create-patient.hook'
import type { ICreatePatientInput } from '@/components/features/patients/types/patient-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewPatientPage() {
  const { mutate, isPending } = useCreatePatient()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreatePatientInput,
    setError: (field: keyof ICreatePatientInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreatePatientInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('E-mail ou documento já cadastrado. Verifique os dados e tente novamente.')
        } else {
          setGlobalError('Não foi possível criar o paciente. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-patient-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/patients">
          <Button variant="ghost" size="sm" data-testid="new-patient-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo paciente</Typography>
      </div>
      <PatientForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
