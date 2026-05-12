'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { DoctorForm } from '@/components/features/doctors/components/doctor-form'
import { useCreateDoctor } from '@/components/features/doctors/hooks/use-create-doctor.hook'
import type { ICreateDoctorInput } from '@/components/features/doctors/types/doctor-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewDoctorPage() {
  const { mutate, isPending } = useCreateDoctor()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateDoctorInput,
    setError: (field: keyof ICreateDoctorInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateDoctorInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('CRM já cadastrado ou usuário já possui perfil de médico.')
        } else {
          setGlobalError('Não foi possível criar o médico. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-doctor-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/doctors">
          <Button variant="ghost" size="sm" data-testid="new-doctor-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo médico</Typography>
      </div>
      <DoctorForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
