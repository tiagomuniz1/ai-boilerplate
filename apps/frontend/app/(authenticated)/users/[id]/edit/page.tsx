'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { UserForm } from '@/components/features/users/components/user-form'
import { useUser } from '@/components/features/users/hooks/use-user.hook'
import { useUpdateUser } from '@/components/features/users/hooks/use-update-user.hook'
import type { IUpdateUserInput } from '@/components/features/users/types/user-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const { data: user, isPending: isLoadingUser, isError: isLoadError } = useUser(id)
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(
    data: IUpdateUserInput,
    setError: (field: keyof IUpdateUserInput, error: { message: string }) => void,
  ) {
    setGlobalError(null)
    updateUser(
      { id, input: data },
      {
        onError: (error: IApiError) => {
          if (error.status === 422 && error.errors) {
            error.errors.forEach(({ field, message }) => {
              setError(field as keyof IUpdateUserInput, { message })
            })
          } else if (error.status === 404) {
            setGlobalError('Usuário não encontrado.')
          } else {
            setGlobalError('Não foi possível atualizar o usuário. Tente novamente.')
          }
        },
      },
    )
  }

  return (
    <main className="p-6 max-w-lg" data-testid="edit-user-page">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/users">
          <Button variant="ghost" size="sm" data-testid="edit-user-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar usuário</Typography>
      </div>

      {isLoadingUser && (
        <div className="flex flex-col gap-4" data-testid="edit-user-skeleton">
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
          <Skeleton height={40} className="w-full" />
        </div>
      )}

      {isLoadError && (
        <Alert variant="error" data-testid="edit-user-load-error">
          Não foi possível carregar os dados do usuário. Verifique o ID e tente novamente.
        </Alert>
      )}

      {!isLoadingUser && !isLoadError && user && (
        <UserForm
          mode="edit"
          defaultValues={user}
          isPending={isUpdating}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
