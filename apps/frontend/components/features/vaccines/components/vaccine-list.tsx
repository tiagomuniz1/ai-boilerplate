'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Input } from '@/components/ui/atoms/input/input'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useVaccines } from '../hooks/use-vaccines.hook'
import { useUpdateVaccine } from '../hooks/use-update-vaccine.hook'
import { useDeleteVaccine } from '../hooks/use-delete-vaccine.hook'
import type { IVaccineModel } from '../types/vaccine-model.types'

const PAGE_SIZE = 20

export function VaccineList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [togglingVaccine, setTogglingVaccine] = useState<IVaccineModel | null>(null)
  const [deletingVaccine, setDeletingVaccine] = useState<IVaccineModel | null>(null)

  // 300ms, como a lista de medicamentos do backoffice — sem isso a busca
  // dispara uma consulta por tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data, isPending, isError } = useVaccines({
    search: debouncedSearch || undefined,
    includeInactive,
    page,
    limit: PAGE_SIZE,
  })

  const updateMutation = useUpdateVaccine()
  const deleteMutation = useDeleteVaccine()

  const vaccines = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6" data-testid="vaccine-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Vacinas</h1>
          {!isPending && !isError && (
            <p className="mt-0.5 text-sm text-text-dim">
              {total === 1 ? '1 vacina no catálogo' : `${total} vacinas no catálogo`}
            </p>
          )}
        </div>
        <Link href="/backoffice/vaccines/new" className="block sm:inline-block">
          <Button variant="primary" data-testid="vaccine-list-new-button" className="w-full sm:w-auto">
            + Nova vacina
          </Button>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          label=""
          id="vaccine-search"
          placeholder="Buscar por nome, sigla ou doença..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          data-testid="vaccine-list-search"
          className="sm:max-w-md"
        />
        <label className="flex items-center gap-2 text-sm text-text-dim">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(event) => {
              setIncludeInactive(event.target.checked)
              setPage(1)
            }}
            data-testid="vaccine-list-include-inactive"
          />
          Incluir inativas
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="vaccine-list-skeleton">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} height={20} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="vaccine-list-error">
              Não foi possível carregar o catálogo. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && vaccines.length === 0 && (
          <div className="py-16 text-center" data-testid="vaccine-list-empty">
            <p className="text-sm text-text-dim">Nenhuma vacina encontrada.</p>
          </div>
        )}

        {!isPending && !isError && vaccines.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left" data-testid="vaccine-list-table">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Nome</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Sigla</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Previne</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Status</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccines.map((vaccine) => (
                    <tr
                      key={vaccine.id}
                      className="border-b border-line last:border-0 hover:bg-surface-raised"
                      data-testid={`vaccine-row-${vaccine.id}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-text" data-testid={`vaccine-name-${vaccine.id}`}>
                        {vaccine.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-dim">{vaccine.abbreviation ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-text-dim">{vaccine.preventedDiseases ?? '—'}</td>
                      <td className="px-6 py-4 text-sm" data-testid={`vaccine-status-${vaccine.id}`}>
                        <span className={vaccine.isActive ? 'text-success' : 'text-text-mute'}>
                          {vaccine.isActive ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/backoffice/vaccines/${vaccine.id}/edit`}
                            data-testid={`vaccine-edit-link-${vaccine.id}`}
                            className="text-sm text-accent hover:underline"
                          >
                            Editar
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTogglingVaccine(vaccine)}
                            data-testid={`vaccine-toggle-${vaccine.id}`}
                            className="text-sm text-text-mute hover:text-text"
                          >
                            {vaccine.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingVaccine(vaccine)}
                            data-testid={`vaccine-delete-${vaccine.id}`}
                            className="text-sm text-danger hover:underline"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="vaccine-list-cards">
              {vaccines.map((vaccine) => (
                <MobileListCard
                  key={vaccine.id}
                  data-testid={`vaccine-card-${vaccine.id}`}
                  title={vaccine.name}
                  rows={[
                    { label: 'Sigla', value: vaccine.abbreviation ?? '—' },
                    { label: 'Status', value: vaccine.isActive ? 'Ativa' : 'Inativa' },
                  ]}
                  actions={
                    <Link
                      href={`/backoffice/vaccines/${vaccine.id}/edit`}
                      data-testid={`vaccine-card-edit-link-${vaccine.id}`}
                      className="text-xs text-accent hover:text-accent/80"
                    >
                      Editar
                    </Link>
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {!isPending && !isError && vaccines.length > 0 && (
        <div className="flex items-center justify-between" data-testid="vaccine-list-pagination">
          <span className="text-sm text-text-dim" data-testid="vaccine-list-page-info">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              data-testid="vaccine-list-prev-page"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              data-testid="vaccine-list-next-page"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!togglingVaccine}
        onClose={() => setTogglingVaccine(null)}
        title={togglingVaccine?.isActive ? 'Desativar vacina' : 'Ativar vacina'}
        data-testid="vaccine-toggle-dialog"
      >
        <p className="text-sm text-text-dim" data-testid="vaccine-toggle-dialog-message">
          {togglingVaccine?.isActive
            ? 'A vacina some das listas das clínicas e não pode mais ser escolhida ao registrar uma dose. As doses já registradas continuam na caderneta.'
            : 'A vacina volta a aparecer para as clínicas.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setTogglingVaccine(null)} data-testid="vaccine-toggle-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate(
                { id: togglingVaccine!.id, data: { isActive: !togglingVaccine!.isActive } },
                { onSuccess: () => setTogglingVaccine(null) },
              )
            }
            data-testid="vaccine-toggle-confirm"
          >
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingVaccine}
        onClose={() => setDeletingVaccine(null)}
        title="Excluir vacina"
        data-testid="vaccine-delete-dialog"
      >
        <p className="text-sm text-text-dim" data-testid="vaccine-delete-dialog-message">
          A vacina sai do catálogo. As doses já registradas na caderneta dos pacientes continuam lá.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingVaccine(null)} data-testid="vaccine-delete-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(deletingVaccine!.id, { onSuccess: () => setDeletingVaccine(null) })
            }
            data-testid="vaccine-delete-confirm"
            className="bg-danger hover:bg-danger/90"
          >
            Excluir
          </Button>
        </div>
      </Modal>
    </div>
  )
}
