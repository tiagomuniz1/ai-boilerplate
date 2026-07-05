'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useThemes } from '@/components/features/themes/hooks/use-themes.hook'
import { useClinics } from '../hooks/use-clinics.hook'
import { ClinicListSkeleton } from './clinic-list-skeleton'

export function ClinicList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: paginatedClinics, isPending, isError } = useClinics(params)
  const { data: themesData } = useThemes(1, 50)

  const clinics = paginatedClinics?.data ?? []
  const clinicCount = clinics.length
  const themes = themesData?.data ?? []
  const themeById = Object.fromEntries(themes.map((t) => [t.id, t]))

  return (
    <div className="flex flex-col gap-6" data-testid="clinic-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Clínicas</h1>
          {!isPending && !isError && paginatedClinics && (
            <p className="mt-0.5 text-sm text-text-dim">
              {clinicCount === 1
                ? '1 clínica cadastrada'
                : `${clinicCount} clínicas cadastradas`}
            </p>
          )}
        </div>
        <Link href="/backoffice/clinics/new" className="block sm:inline-block">
          <Button variant="primary" data-testid="clinic-list-new-button" className="w-full sm:w-auto">
            + Nova clínica
          </Button>
        </Link>
      </div>

      <Input
        label=""
        id="clinic-search"
        placeholder="Buscar por nome ou slug..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="clinic-list-search"
      />

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <ClinicListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="clinic-list-error">
              Não foi possível carregar a lista de clínicas. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && clinics.length === 0 && (
          <div className="py-16 text-center" data-testid="clinic-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhuma clínica encontrada para a busca realizada.'
                : 'Nenhuma clínica encontrada.'}
            </p>
          </div>
        )}

        {!isPending && !isError && clinics.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="clinic-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Status
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute lg:table-cell">
                    Tema
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((clinic) => {
                  const theme = clinic.themeId ? themeById[clinic.themeId] : undefined
                  return (
                    <tr
                      key={clinic.id}
                      data-testid={`clinic-table-row-${clinic.id}`}
                      className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                    >
                      <td className="px-6 py-4">
                        <p
                          className="text-sm font-medium text-text"
                          data-testid={`clinic-name-${clinic.id}`}
                        >
                          {clinic.name}
                        </p>
                      </td>
                      <td
                        className="px-6 py-4 font-mono text-sm text-text-dim"
                        data-testid={`clinic-slug-${clinic.id}`}
                      >
                        {clinic.slug}
                      </td>
                      <td className="px-6 py-4" data-testid={`clinic-status-${clinic.id}`}>
                        {clinic.isActive ? (
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Ativa
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                            data-testid={`clinic-inactive-badge-${clinic.id}`}
                          >
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell" data-testid={`clinic-theme-${clinic.id}`}>
                        {theme ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 flex-shrink-0 rounded-full border border-line"
                              style={{ background: theme.accentColor }}
                              aria-hidden="true"
                            />
                            <span className="text-sm text-text">{theme.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-text-mute">Padrão</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/backoffice/clinics/${clinic.id}/users/new`}
                            data-testid={`clinic-add-user-link-${clinic.id}`}
                            className="text-xs text-text-mute hover:text-text transition-colors"
                          >
                            + Usuário
                          </Link>
                          <Link
                            href={`/backoffice/clinics/${clinic.id}/edit`}
                            data-testid={`clinic-edit-link-${clinic.id}`}
                            className="text-xs text-text-mute hover:text-text transition-colors"
                          >
                            Editar
                          </Link>
                          <Link
                            href={`/backoffice/clinics/${clinic.id}`}
                            data-testid={`clinic-view-link-${clinic.id}`}
                            className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                            aria-label={`Ver detalhes de ${clinic.name}`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M6 12L10 8L6 4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && clinics.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="clinic-list-cards">
            {clinics.map((clinic) => {
              const theme = clinic.themeId ? themeById[clinic.themeId] : undefined
              return (
                <MobileListCard
                  key={clinic.id}
                  data-testid={`clinic-card-${clinic.id}`}
                  title={clinic.name}
                  rows={[
                    { label: 'Slug', value: <span className="font-mono">{clinic.slug}</span> },
                    {
                      label: 'Status',
                      value: clinic.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                          Ativa
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger"
                          data-testid={`clinic-card-inactive-badge-${clinic.id}`}
                        >
                          Inativa
                        </span>
                      ),
                    },
                    {
                      label: 'Tema',
                      value: theme ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 shrink-0 rounded-full border border-line"
                            style={{ background: theme.accentColor }}
                            aria-hidden="true"
                          />
                          <span>{theme.name}</span>
                        </span>
                      ) : (
                        <span className="text-text-mute">Padrão</span>
                      ),
                    },
                  ]}
                  actions={
                    <>
                      <Link
                        href={`/backoffice/clinics/${clinic.id}/users/new`}
                        data-testid={`clinic-card-add-user-link-${clinic.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        + Usuário
                      </Link>
                      <Link
                        href={`/backoffice/clinics/${clinic.id}/edit`}
                        data-testid={`clinic-card-edit-link-${clinic.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/backoffice/clinics/${clinic.id}`}
                        data-testid={`clinic-card-view-link-${clinic.id}`}
                        className="ml-auto flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                      >
                        Ver detalhes
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    </>
                  }
                />
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
