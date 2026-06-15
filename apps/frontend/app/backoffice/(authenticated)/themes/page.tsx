'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/atoms/button/button'
import { Typography } from '@/components/ui/atoms/typography/typography'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useThemes } from '@/components/features/themes/hooks/use-themes.hook'
import { useDeleteTheme } from '@/components/features/themes/hooks/use-delete-theme.hook'
import type { IThemeModel } from '@/components/features/themes/types/theme-model.types'
import type { IApiError } from '@/types/api.types'

function ThemeSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-5 w-5 rounded border border-line"
        style={{ background: color }}
        title={color}
        aria-hidden="true"
      />
      <span className="text-xs text-text-mute">{label}</span>
    </div>
  )
}

function ThemeRow({
  theme,
  onDelete,
  isDeleting,
}: {
  theme: IThemeModel
  onDelete: (id: string) => void
  isDeleting: boolean
}) {
  return (
    <div
      data-testid={`theme-row-${theme.id}`}
      className="flex items-center justify-between gap-4 rounded-md border border-line bg-surface p-4"
    >
      <div className="flex flex-1 items-center gap-4 min-w-0">
        <div className="flex gap-2">
          <div
            className="h-8 w-8 rounded-md border border-line"
            style={{ background: theme.accentColor }}
            title={theme.accentColor}
          />
          <div
            className="h-8 w-8 rounded-md border border-line"
            style={{ background: theme.accentSoftColor }}
            title={theme.accentSoftColor}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text truncate">{theme.name}</span>
            {theme.isDefault && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Padrão
              </span>
            )}
          </div>
          <span className="text-xs text-text-mute">{theme.slug}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/backoffice/themes/${theme.id}/edit`}>
          <Button variant="ghost" size="sm" data-testid={`theme-edit-${theme.id}`}>
            Editar
          </Button>
        </Link>
        {!theme.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isDeleting}
            data-testid={`theme-delete-${theme.id}`}
            onClick={() => onDelete(theme.id)}
            className="text-danger hover:bg-danger-soft hover:text-danger"
          >
            Excluir
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ThemesPage() {
  const { data, isPending, isError } = useThemes()
  const { mutate: deleteTheme, isPending: isDeleting } = useDeleteTheme()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete(id: string) {
    setDeleteError(null)
    deleteTheme(id, {
      onError: (err) => {
        const error = err as unknown as IApiError
        setDeleteError(error.detail ?? 'Não foi possível excluir o tema.')
      },
    })
  }

  return (
    <main className="max-w-2xl p-6" data-testid="themes-page">
      <div className="mb-6 flex items-center justify-between">
        <Typography variant="h2">Temas</Typography>
        <Link href="/backoffice/themes/new">
          <Button size="sm" data-testid="themes-new-button">
            + Novo tema
          </Button>
        </Link>
      </div>

      {deleteError && (
        <Alert variant="error" className="mb-4" data-testid="themes-delete-error">
          {deleteError}
        </Alert>
      )}

      {isPending && (
        <div className="flex flex-col gap-3" data-testid="themes-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-surface" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="error" data-testid="themes-load-error">
          Não foi possível carregar os temas.
        </Alert>
      )}

      {!isPending && !isError && data && (
        <div className="flex flex-col gap-3" data-testid="themes-list">
          {data.data.map((theme) => (
            <ThemeRow
              key={theme.id}
              theme={theme}
              onDelete={handleDelete}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}
    </main>
  )
}
