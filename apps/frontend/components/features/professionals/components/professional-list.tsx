'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useProfessionals } from '../hooks/use-professionals.hook'
import { useDeleteProfessional } from '../hooks/use-delete-professional.hook'
import { ProfessionalListSkeleton } from './professional-list-skeleton'
import { ProfessionalDeleteDialog } from './professional-delete-dialog'
import { primaryProfessionLabel, primaryOccupationLabel, primaryRegistrationLabel } from '../utils/profession-label'
import type { IProfessionalModel } from '../types/professional-model.types'

export function ProfessionalList() {
  const basePath = useBasePath()
  const role = useAuthStore((s) => s.user?.role)
  const canCreate = role === UserRole.ADMIN
  // Deleting a professional is ADMIN-only (ai/context/permissions.md). The backend
  // rejects it with 403, so an ungated button just hands the user an error.
  const canDelete = role === UserRole.ADMIN
  const canViewAppointments =
    role === UserRole.ADMIN || role === UserRole.PROFESSIONAL || role === UserRole.USER
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [professionalToDelete, setProfessionalToDelete] = useState<IProfessionalModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: professionals, isPending, isError } = useProfessionals(params)
  const { mutate: deleteProfessional, isPending: isDeleting } = useDeleteProfessional()

  function handleDeleteClick(professional: IProfessionalModel) {
    setProfessionalToDelete(professional)
  }

  function handleDeleteClose() {
    setProfessionalToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!professionalToDelete) return

    deleteProfessional(professionalToDelete.id, {
      onSuccess: () => {
        setProfessionalToDelete(null)
        setSuccessMessage(`Profissional ${professionalToDelete.user.fullName} excluído com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: () => {
        setProfessionalToDelete(null)
      },
    })
  }

  const professionalCount = professionals?.length ?? 0

  return (
    <div className="flex flex-col gap-6" data-testid="professional-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Profissionais</h1>
          {!isPending && !isError && professionals && (
            <p className="mt-0.5 text-sm text-text-dim">
              {professionalCount === 1
                ? '1 profissional cadastrado'
                : `${professionalCount} profissionais cadastrados`}
            </p>
          )}
        </div>
        {canCreate && (
          <Link href={`${basePath}/professionals/new`} className="block sm:inline-block">
            <Button variant="primary" data-testid="professional-list-new-button" className="w-full sm:w-auto">
              + Novo profissional
            </Button>
          </Link>
        )}
      </div>

      <Input
        label=""
        id="professional-search"
        placeholder="Buscar por nome ou especialidade..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="professional-list-search"
      />

      {successMessage && (
        <Alert variant="success" data-testid="professional-list-success">
          {successMessage}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <ProfessionalListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="professional-list-error">
              Não foi possível carregar a lista de profissionais. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && professionals && professionals.length === 0 && (
          <div className="py-16 text-center" data-testid="professional-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhum profissional encontrado para a busca realizada.'
                : 'Nenhum profissional encontrado.'}
            </p>
          </div>
        )}

        {!isPending && !isError && professionals && professionals.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="professional-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Profissional
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Tipo / Registro
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((professional) => (
                  <tr
                    key={professional.id}
                    data-testid={`professional-table-row-${professional.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <p
                        className="text-sm font-medium text-text"
                        data-testid={`professional-name-${professional.id}`}
                      >
                        {professional.user.fullName}
                      </p>
                      <p
                        className="text-xs text-text-dim"
                        data-testid={`professional-email-${professional.id}`}
                      >
                        {professional.user.email}
                      </p>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      data-testid={`professional-crm-${professional.id}`}
                    >
                      <p
                        className="text-sm font-medium text-text"
                        data-testid={`professional-type-${professional.id}`}
                      >
                        {primaryProfessionLabel(professional.registrations)}
                      </p>
                      <p className="text-xs text-text-dim">
                        {primaryRegistrationLabel(professional.registrations)}
                      </p>
                    </td>
                    <td
                      className="px-6 py-4"
                      data-testid={`professional-specialty-${professional.id}`}
                    >
                      <div className="flex flex-wrap gap-1">
                        {professional.specialties.length > 0 ? (
                          <>
                            {professional.specialties.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                data-testid={`professional-specialty-badge-${s.id}`}
                                className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                              >
                                {s.name}
                              </span>
                            ))}
                            {professional.specialties.length > 2 && (
                              <span className="inline-flex items-center text-xs text-text-mute">
                                +{professional.specialties.length - 2} mais
                              </span>
                            )}
                          </>
                        ) : (
                          <span
                            data-testid={`professional-occupation-${professional.id}`}
                            className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                          >
                            {primaryOccupationLabel(professional.registrations)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(professional)}
                            data-testid={`professional-delete-button-${professional.id}`}
                            className="text-xs text-danger hover:text-danger/80"
                          >
                            Excluir
                          </Button>
                        )}
                        <Link
                          href={`${basePath}/professionals/${professional.id}/edit`}
                          data-testid={`professional-edit-link-${professional.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                        {canViewAppointments && (
                          <Link
                            href={`${basePath}/appointments?doctor=${professional.id}`}
                            data-testid={`professional-appointments-link-${professional.id}`}
                            className="text-xs text-text-mute hover:text-text transition-colors"
                          >
                            Consultas
                          </Link>
                        )}
                        <Link
                          href={`${basePath}/professionals/${professional.id}`}
                          data-testid={`professional-view-link-${professional.id}`}
                          className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                          aria-label={`Ver detalhes de ${professional.user.fullName}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

        {!isPending && !isError && professionals && professionals.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="professional-list-cards">
            {professionals.map((professional) => (
              <MobileListCard
                key={professional.id}
                data-testid={`professional-card-${professional.id}`}
                title={
                  <span className="block">
                    <span className="block">{professional.user.fullName}</span>
                    <span className="block text-xs font-normal text-text-dim">{professional.user.email}</span>
                  </span>
                }
                rows={[
                  { label: 'Tipo', value: primaryProfessionLabel(professional.registrations) },
                  { label: 'Registro', value: primaryRegistrationLabel(professional.registrations) },
                  {
                    label: 'Especialidade',
                    value: (
                      <span className="flex flex-wrap justify-end gap-1">
                        {professional.specialties.length > 0 ? (
                          <>
                            {professional.specialties.slice(0, 2).map((s) => (
                              <span
                                key={s.id}
                                data-testid={`professional-card-specialty-badge-${s.id}`}
                                className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                              >
                                {s.name}
                              </span>
                            ))}
                            {professional.specialties.length > 2 && (
                              <span className="inline-flex items-center text-xs text-text-mute">
                                +{professional.specialties.length - 2} mais
                              </span>
                            )}
                          </>
                        ) : (
                          <span
                            data-testid={`professional-card-occupation-${professional.id}`}
                            className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-text"
                          >
                            {primaryOccupationLabel(professional.registrations)}
                          </span>
                        )}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(professional)}
                        data-testid={`professional-card-delete-button-${professional.id}`}
                        className="text-xs text-danger hover:text-danger/80"
                      >
                        Excluir
                      </Button>
                    )}
                    <Link
                      href={`${basePath}/professionals/${professional.id}/edit`}
                      data-testid={`professional-card-edit-link-${professional.id}`}
                      className="text-xs text-text-mute hover:text-text transition-colors"
                    >
                      Editar
                    </Link>
                    {canViewAppointments && (
                      <Link
                        href={`${basePath}/appointments?doctor=${professional.id}`}
                        data-testid={`professional-card-appointments-link-${professional.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Consultas
                      </Link>
                    )}
                    <Link
                      href={`${basePath}/professionals/${professional.id}`}
                      data-testid={`professional-card-view-link-${professional.id}`}
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
            ))}
          </ul>
        )}
      </div>

      <ProfessionalDeleteDialog
        professional={professionalToDelete}
        isOpen={professionalToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
