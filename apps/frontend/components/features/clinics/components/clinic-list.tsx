'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { useAuthStore } from '@/stores/auth.store'
import { useClinics } from '../hooks/use-clinics.hook'
import { ClinicListSkeleton } from './clinic-list-skeleton'

export function ClinicList() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    if (user?.role && user.role !== UserRole.ADMIN) {
      router.replace('/dashboard')
    }
  }, [user?.role, router])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: paginatedClinics, isPending, isError } = useClinics(params)

  const clinics = paginatedClinics?.data ?? []
  const clinicCount = clinics.length

  return (
    <div className="flex flex-col gap-6" data-testid="clinic-list">
      <div className="flex items-start justify-between gap-4">
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
        <Link href="/clinics/new">
          <Button variant="primary" data-testid="clinic-list-new-button">
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
          <div className="overflow-x-auto">
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
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((clinic) => (
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
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/clinics/${clinic.id}/edit`}
                          data-testid={`clinic-edit-link-${clinic.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/clinics/${clinic.id}`}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
