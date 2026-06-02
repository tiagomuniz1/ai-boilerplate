'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { useAuthStore } from '@/stores/auth.store'
import { useSpecialties } from '../hooks/use-specialties.hook'
import { useDeleteSpecialty } from '../hooks/use-delete-specialty.hook'
import { SpecialtyListSkeleton } from './specialty-list-skeleton'
import { SpecialtyDeleteDialog } from './specialty-delete-dialog'
import type { IApiError } from '@/types/api.types'
import type { ISpecialtyModel } from '../types/specialty-model.types'

export function SpecialtyList() {
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === UserRole.ADMIN

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [specialtyToDelete, setSpecialtyToDelete] = useState<ISpecialtyModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const params = debouncedSearch ? { search: debouncedSearch } : undefined
  const { data: specialtiesPage, isPending, isError } = useSpecialties(params)
  const { mutate: deleteSpecialty, isPending: isDeleting } = useDeleteSpecialty()

  const specialties = specialtiesPage?.data ?? []

  function handleDeleteClick(specialty: ISpecialtyModel) {
    setSpecialtyToDelete(specialty)
  }

  function handleDeleteClose() {
    setSpecialtyToDelete(null)
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!specialtyToDelete) return

    deleteSpecialty(specialtyToDelete.id, {
      onSuccess: () => {
        setSpecialtyToDelete(null)
        setDeleteError(null)
        setSuccessMessage(`Especialidade ${specialtyToDelete.name} excluída com sucesso.`)
        setTimeout(() => setSuccessMessage(null), 5000)
      },
      onError: (error: IApiError) => {
        setSpecialtyToDelete(null)
        if (error.status === 409) {
          setDeleteError(`Não é possível excluir "${specialtyToDelete.name}" pois ela está vinculada a médicos ativos.`)
        } else {
          setDeleteError('Não foi possível excluir a especialidade. Tente novamente.')
        }
        setTimeout(() => setDeleteError(null), 6000)
      },
    })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="specialty-list">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Especialidades</h1>
          {!isPending && !isError && specialtiesPage && (
            <p className="mt-0.5 text-sm text-text-dim">
              {specialtiesPage.total === 1
                ? '1 especialidade cadastrada'
                : `${specialtiesPage.total} especialidades cadastradas`}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link href="/specialties/new">
            <Button variant="primary" data-testid="specialty-list-new-button">
              + Nova especialidade
            </Button>
          </Link>
        )}
      </div>

      <Input
        label=""
        id="specialty-search"
        placeholder="Buscar por nome..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        data-testid="specialty-list-search"
      />

      {successMessage && (
        <Alert variant="success" data-testid="specialty-list-success">
          {successMessage}
        </Alert>
      )}

      {deleteError && (
        <Alert variant="error" data-testid="specialty-list-delete-error">
          {deleteError}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <SpecialtyListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="specialty-list-error">
              Não foi possível carregar a lista de especialidades. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && specialties.length === 0 && (
          <div className="py-16 text-center" data-testid="specialty-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhuma especialidade encontrada para a busca realizada.'
                : 'Nenhuma especialidade encontrada.'}
            </p>
          </div>
        )}

        {!isPending && !isError && specialties.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left" data-testid="specialty-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Cadastrado em
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {specialties.map((specialty) => (
                  <tr
                    key={specialty.id}
                    data-testid={`specialty-table-row-${specialty.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium text-text"
                      data-testid={`specialty-name-${specialty.id}`}
                    >
                      {specialty.name}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim max-w-xs truncate"
                      data-testid={`specialty-description-${specialty.id}`}
                    >
                      {specialty.description ?? '—'}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim whitespace-nowrap"
                      data-testid={`specialty-created-at-${specialty.id}`}
                    >
                      {specialty.createdAt.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(specialty)}
                              data-testid={`specialty-delete-button-${specialty.id}`}
                              className="text-xs text-danger hover:text-danger/80"
                            >
                              Excluir
                            </Button>
                            <Link
                              href={`/specialties/${specialty.id}/edit`}
                              data-testid={`specialty-edit-link-${specialty.id}`}
                              className="text-xs text-text-mute hover:text-text transition-colors"
                            >
                              Editar
                            </Link>
                          </>
                        )}
                        <Link
                          href={`/specialties/${specialty.id}`}
                          data-testid={`specialty-view-link-${specialty.id}`}
                          className="flex items-center justify-center rounded-md p-1.5 text-text-mute transition-colors hover:bg-line hover:text-text"
                          aria-label={`Ver detalhes de ${specialty.name}`}
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
      </div>

      <SpecialtyDeleteDialog
        specialty={specialtyToDelete}
        isOpen={specialtyToDelete !== null}
        isPending={isDeleting}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
