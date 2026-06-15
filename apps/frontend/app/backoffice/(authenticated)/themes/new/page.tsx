'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { ThemeForm } from '@/components/features/themes/components/theme-form'
import { useCreateTheme } from '@/components/features/themes/hooks/use-create-theme.hook'
import type { ICreateThemeInput } from '@/components/features/themes/types/theme-input.types'
import type { IApiError } from '@/types/api.types'

export default function NewThemePage() {
  const { mutate, isPending } = useCreateTheme()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(data: ICreateThemeInput, setError: (field: string, error: { message: string }) => void) {
    setGlobalError(null)
    mutate(data as ICreateThemeInput, {
      onError: (err) => {
        const error = err as unknown as IApiError
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field, { message })
          })
        } else {
          setGlobalError('Não foi possível criar o tema. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="max-w-lg p-6" data-testid="new-theme-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/backoffice/themes">
          <Button variant="ghost" size="sm" data-testid="new-theme-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Novo tema</Typography>
      </div>
      <ThemeForm
        mode="create"
        isPending={isPending}
        globalError={globalError}
        onSubmit={handleSubmit}
      />
    </main>
  )
}
