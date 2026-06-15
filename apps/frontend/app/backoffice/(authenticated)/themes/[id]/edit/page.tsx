'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { ThemeForm } from '@/components/features/themes/components/theme-form'
import { useTheme } from '@/components/features/themes/hooks/use-theme.hook'
import { useUpdateTheme } from '@/components/features/themes/hooks/use-update-theme.hook'
import type { IUpdateThemeInput } from '@/components/features/themes/types/theme-input.types'
import type { IApiError } from '@/types/api.types'

export default function EditThemePage() {
  const { id } = useParams<{ id: string }>()
  const { data: theme, isPending: isLoading, isError } = useTheme(id)
  const { mutate, isPending: isSaving } = useUpdateTheme(id)
  const [globalError, setGlobalError] = useState<string | null>(null)

  function handleSubmit(data: IUpdateThemeInput, setError: (field: string, error: { message: string }) => void) {
    setGlobalError(null)
    mutate(data, {
      onError: (err) => {
        const error = err as unknown as IApiError
        if (error.status === 422 && error.errors) {
          error.errors.forEach(({ field, message }) => {
            setError(field, { message })
          })
        } else {
          setGlobalError('Não foi possível salvar o tema. Tente novamente.')
        }
      },
    })
  }

  return (
    <main className="max-w-lg p-6" data-testid="edit-theme-page">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/backoffice/themes">
          <Button variant="ghost" size="sm" data-testid="edit-theme-back-button">
            ← Voltar
          </Button>
        </Link>
        <Typography variant="h2">Editar tema</Typography>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4" data-testid="edit-theme-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="edit-theme-load-error">
          Não foi possível carregar o tema.
        </Alert>
      )}

      {!isLoading && !isError && theme && (
        <ThemeForm
          mode="edit"
          defaultValues={theme}
          isPending={isSaving}
          globalError={globalError}
          onSubmit={handleSubmit}
        />
      )}
    </main>
  )
}
