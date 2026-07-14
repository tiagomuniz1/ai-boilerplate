'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { MedicationSource } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useMedications } from '../hooks/use-medications.hook'
import { useUpdateMedication } from '../hooks/use-update-medication.hook'
import { useDeleteMedication } from '../hooks/use-delete-medication.hook'
import { MedicationListSkeleton } from './medication-list-skeleton'
import { MedicationToggleDialog } from './medication-toggle-dialog'
import { MedicationDeleteDialog } from './medication-delete-dialog'
import type { IApiError } from '@/types/api.types'
import type { IMedicationModel } from '../types/medication-model.types'

const PAGE_SIZE = 20

const SOURCE_LABELS: Record<MedicationSource, string> = {
  [MedicationSource.ANVISA]: 'ANVISA',
  [MedicationSource.MANUAL]: 'Manual',
}

export function MedicationList() {
  const basePath = useBasePath()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [medicationToToggle, setMedicationToToggle] = useState<IMedicationModel | null>(null)
  const [medicationToDelete, setMedicationToDelete] = useState<IMedicationModel | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Reset to the first page whenever the inactive filter changes.
  useEffect(() => {
    setPage(1)
  }, [includeInactive])

  const { data, isPending, isError } = useMedications({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    includeInactive,
  })
  const { mutate: updateMedication, isPending: isToggling } = useUpdateMedication()
  const { mutate: deleteMedication, isPending: isDeleting } = useDeleteMedication()

  const medications = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function flashSuccess(message: string) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 5000)
  }

  function flashError(message: string) {
    setActionError(message)
    setTimeout(() => setActionError(null), 6000)
  }

  function handleToggleConfirm() {
    /* c8 ignore next */
    if (!medicationToToggle) return
    const target = medicationToToggle
    updateMedication(
      { id: target.id, data: { isActive: !target.isActive } },
      {
        onSuccess: () => {
          setMedicationToToggle(null)
          flashSuccess(`"${target.name}" ${target.isActive ? 'desativado' : 'ativado'} com sucesso.`)
        },
        onError: (_error: IApiError) => {
          setMedicationToToggle(null)
          flashError('Não foi possível alterar o medicamento. Tente novamente.')
        },
      },
    )
  }

  function handleDeleteConfirm() {
    /* c8 ignore next */
    if (!medicationToDelete) return
    const target = medicationToDelete
    deleteMedication(target.id, {
      onSuccess: () => {
        setMedicationToDelete(null)
        flashSuccess(`"${target.name}" excluído com sucesso.`)
      },
      onError: (_error: IApiError) => {
        setMedicationToDelete(null)
        flashError('Não foi possível excluir o medicamento. Tente novamente.')
      },
    })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="medication-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Medicamentos</h1>
          {!isPending && !isError && (
            <p className="mt-0.5 text-sm text-text-dim" data-testid="medication-list-count">
              {total === 1 ? '1 medicamento' : `${total} medicamentos`}
            </p>
          )}
        </div>
        <Link href={`${basePath}/medications/new`} className="block sm:inline-block">
          <Button variant="primary" data-testid="medication-list-new-button" className="w-full sm:w-auto">
            + Novo medicamento
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          label=""
          id="medication-search"
          placeholder="Buscar por nome ou princípio ativo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          data-testid="medication-list-search"
          className="sm:w-80"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="include-inactive"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="h-4 w-4 rounded border-line text-accent"
            data-testid="medication-list-include-inactive"
          />
          <label htmlFor="include-inactive" className="text-sm text-text-dim cursor-pointer">
            Incluir inativos
          </label>
        </div>
      </div>

      {successMessage && (
        <Alert variant="success" data-testid="medication-list-success">
          {successMessage}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" data-testid="medication-list-action-error">
          {actionError}
        </Alert>
      )}

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <MedicationListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="medication-list-error">
              Não foi possível carregar a lista de medicamentos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && medications.length === 0 && (
          <div className="py-16 text-center" data-testid="medication-list-empty">
            <p className="text-sm text-text-dim">
              {debouncedSearch
                ? 'Nenhum medicamento encontrado para a busca realizada.'
                : 'Nenhum medicamento cadastrado.'}
            </p>
          </div>
        )}

        {!isPending && !isError && medications.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="medication-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Nome</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Princípio ativo</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Classe terapêutica</th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute lg:table-cell">Origem</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Status</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((medication) => (
                  <tr
                    key={medication.id}
                    data-testid={`medication-row-${medication.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-text whitespace-nowrap" data-testid={`medication-name-${medication.id}`}>
                      {medication.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {medication.activeIngredient ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-dim">
                      {medication.therapeuticClass ?? '—'}
                    </td>
                    <td className="hidden px-6 py-4 text-sm text-text-dim lg:table-cell" data-testid={`medication-source-${medication.id}`}>
                      {SOURCE_LABELS[medication.source]}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        data-testid={`medication-status-${medication.id}`}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          medication.isActive ? 'bg-good-soft text-good' : 'bg-line text-text-mute'
                        }`}
                      >
                        {medication.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMedicationToToggle(medication)}
                          data-testid={`medication-toggle-button-${medication.id}`}
                          className="text-xs text-text-mute hover:text-text"
                        >
                          {medication.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Link
                          href={`${basePath}/medications/${medication.id}/edit`}
                          data-testid={`medication-edit-link-${medication.id}`}
                          className="text-xs text-text-mute hover:text-text transition-colors"
                        >
                          Editar
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMedicationToDelete(medication)}
                          data-testid={`medication-delete-button-${medication.id}`}
                          className="text-xs text-danger hover:text-danger"
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && medications.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="medication-list-cards">
            {medications.map((medication) => (
              <MobileListCard
                key={medication.id}
                data-testid={`medication-card-${medication.id}`}
                title={medication.name}
                rows={[
                  { label: 'Princípio ativo', value: medication.activeIngredient ?? '—' },
                  { label: 'Classe terapêutica', value: medication.therapeuticClass ?? '—' },
                  { label: 'Origem', value: SOURCE_LABELS[medication.source] },
                  {
                    label: 'Status',
                    value: (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          medication.isActive ? 'bg-good-soft text-good' : 'bg-line text-text-mute'
                        }`}
                      >
                        {medication.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMedicationToToggle(medication)}
                      data-testid={`medication-card-toggle-button-${medication.id}`}
                      className="text-xs text-text-mute hover:text-text"
                    >
                      {medication.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Link
                      href={`${basePath}/medications/${medication.id}/edit`}
                      data-testid={`medication-card-edit-link-${medication.id}`}
                      className="text-xs text-text-mute hover:text-text transition-colors"
                    >
                      Editar
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMedicationToDelete(medication)}
                      data-testid={`medication-card-delete-button-${medication.id}`}
                      className="text-xs text-danger hover:text-danger"
                    >
                      Excluir
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </div>

      {!isPending && !isError && medications.length > 0 && (
        <div className="flex items-center justify-between" data-testid="medication-list-pagination">
          <span className="text-sm text-text-dim" data-testid="medication-list-page-info">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              data-testid="medication-list-prev-page"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              data-testid="medication-list-next-page"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <MedicationToggleDialog
        medication={medicationToToggle}
        isOpen={medicationToToggle !== null}
        isPending={isToggling}
        onClose={() => setMedicationToToggle(null)}
        onConfirm={handleToggleConfirm}
      />

      <MedicationDeleteDialog
        medication={medicationToDelete}
        isOpen={medicationToDelete !== null}
        isPending={isDeleting}
        onClose={() => setMedicationToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
