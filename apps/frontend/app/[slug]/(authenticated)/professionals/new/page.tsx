'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { ProfessionalForm } from '@/components/features/professionals/components/professional-form'
import { useCreateProfessional } from '@/components/features/professionals/hooks/use-create-professional.hook'
import type { ICreateProfessionalInput } from '@/components/features/professionals/types/professional-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewProfessionalPage() {
  const basePath = useBasePath()
  const { mutate, isPending } = useCreateProfessional()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateProfessionalInput,
    setError: (field: keyof ICreateProfessionalInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateProfessionalInput, { message })
          })
        } else if (error.status === 409) {
          setGlobalError('Registro já cadastrado ou usuário já possui perfil de profissional.')
        } else {
          setGlobalError('Não foi possível criar o profissional. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-professional-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`${basePath}/professionals`}>
          <Button variant="ghost" size="sm" data-testid="new-professional-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo profissional</Typography>
      </div>
      <ProfessionalForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
