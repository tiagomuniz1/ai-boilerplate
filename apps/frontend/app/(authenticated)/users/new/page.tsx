'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { UserForm } from '@/components/features/users/components/user-form'
import { useCreateUser } from '@/components/features/users/hooks/use-create-user.hook'
import type { ICreateUserInput } from '@/components/features/users/types/user-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewUserPage() {
  const { mutate, isPending } = useCreateUser()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: ICreateUserInput,
    setError: (field: keyof ICreateUserInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    mutate(data, {
      onError: (error: IApiError) => {
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field as keyof ICreateUserInput, { message })
          })
        } else {
          setGlobalError('Não foi possível criar o usuário. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="p-6 max-w-lg" data-testid="new-user-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/users">
          <Button variant="ghost" size="sm" data-testid="new-user-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo usuário</Typography>
      </div>
      <UserForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
