'use client'

import { useState } from 'react'
import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { useMyProfessional } from '@/components/features/professionals/hooks/use-my-professional.hook'
import { useVaccinations } from '../hooks/use-vaccinations.hook'
import { useCreateVaccination } from '../hooks/use-create-vaccination.hook'
import { useDeleteVaccination } from '../hooks/use-delete-vaccination.hook'
import { VaccinationForm } from './vaccination-form'
import type { ICreateVaccinationInput } from '../types/vaccination-input.types'
import type { IVaccinationModel } from '../types/vaccination-model.types'
import type { IApiError } from '@/types/api.types'

const PAGE_SIZE = 20

function formatDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function origem(vaccination: IVaccinationModel): string {
  if (vaccination.appliedAtOurClinic) return 'Nesta clínica'
  return vaccination.appliedAtDescription || 'Outro serviço'
}

interface VaccinationHistoryProps {
  patientId: string
  /** Quando a caderneta é aberta de dentro de um atendimento, o registro nasce vinculado a ele. */
  appointmentId?: string
}

export function VaccinationHistory({ patientId, appointmentId }: VaccinationHistoryProps) {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === UserRole.ADMIN

  // Registrar é exercício, e exercício vem da ficha, não do cargo — a mesma
  // regra de receita, atestado e modelo de receita.
  const { data: myProfessional } = useMyProfessional()
  const canRecord = !!myProfessional

  const [page, setPage] = useState(1)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data, isPending, isError } = useVaccinations({ patientId, page, limit: PAGE_SIZE })
  const createMutation = useCreateVaccination()
  const deleteMutation = useDeleteVaccination()

  const vaccinations = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Corrigir e excluir são escopo: o ADMIN é zelador da caderneta da clínica,
  // o profissional mexe apenas no que ele mesmo lançou.
  function canManage(vaccination: IVaccinationModel): boolean {
    return isAdmin || vaccination.recordedByProfessionalId === myProfessional?.id
  }

  function handleCreate(input: ICreateVaccinationInput) {
    setFormError(null)
    createMutation.mutate(input, {
      onSuccess: () => {
        setIsFormOpen(false)
        setPage(1)
      },
      onError: (error) => {
        const apiError = error as unknown as IApiError
        setFormError(apiError.detail ?? 'Erro ao registrar a dose. Tente novamente.')
      },
    })
  }

  return (
    <div className="flex flex-col gap-4" data-testid="vaccination-history">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">Caderneta de vacinação</h2>
          {!isPending && !isError && (
            <p className="mt-0.5 text-sm text-text-dim">
              {total === 1 ? '1 dose registrada' : `${total} doses registradas`}
            </p>
          )}
        </div>
        {canRecord && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormError(null)
              setIsFormOpen(true)
            }}
            data-testid="vaccination-history-new-button"
          >
            + Registrar dose
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="vaccination-history-skeleton">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} height={20} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="vaccination-history-error">
              Não foi possível carregar a caderneta. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && vaccinations.length === 0 && (
          <div className="py-12 text-center" data-testid="vaccination-history-empty">
            <p className="text-sm text-text-dim">Nenhuma dose registrada para este paciente.</p>
          </div>
        )}

        {!isPending && !isError && vaccinations.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left" data-testid="vaccination-history-table">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Vacina</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Dose</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Data</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Onde</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Registrado por</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccinations.map((vaccination) => (
                    <tr
                      key={vaccination.id}
                      className="border-b border-line last:border-0 hover:bg-surface-raised"
                      data-testid={`vaccination-row-${vaccination.id}`}
                    >
                      <td
                        className="px-6 py-4 text-sm font-medium text-text"
                        data-testid={`vaccination-name-${vaccination.id}`}
                      >
                        {vaccination.vaccineName}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-dim">{vaccination.doseLabel}</td>
                      <td className="px-6 py-4 text-sm text-text-dim">{formatDate(vaccination.appliedAt)}</td>
                      <td className="px-6 py-4 text-sm text-text-dim">{origem(vaccination)}</td>
                      <td className="px-6 py-4 text-sm text-text-dim">
                        {vaccination.recordedByProfessionalName}
                      </td>
                      <td className="px-6 py-4">
                        {canManage(vaccination) && (
                          <button
                            type="button"
                            onClick={() => setDeletingId(vaccination.id)}
                            className="text-sm text-danger hover:underline"
                            data-testid={`vaccination-delete-${vaccination.id}`}
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="vaccination-history-cards">
              {vaccinations.map((vaccination) => (
                <MobileListCard
                  key={vaccination.id}
                  data-testid={`vaccination-card-${vaccination.id}`}
                  title={vaccination.vaccineName}
                  rows={[
                    { label: 'Dose', value: vaccination.doseLabel },
                    { label: 'Data', value: formatDate(vaccination.appliedAt) },
                    { label: 'Onde', value: origem(vaccination) },
                    { label: 'Registrado por', value: vaccination.recordedByProfessionalName },
                  ]}
                  actions={
                    canManage(vaccination) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(vaccination.id)}
                        data-testid={`vaccination-card-delete-${vaccination.id}`}
                        className="text-xs text-danger hover:text-danger/80"
                      >
                        Excluir
                      </Button>
                    ) : null
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {!isPending && !isError && vaccinations.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="vaccination-history-pagination">
          <span className="text-sm text-text-dim" data-testid="vaccination-history-page-info">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              data-testid="vaccination-history-prev-page"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              data-testid="vaccination-history-next-page"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Registrar dose"
        data-testid="vaccination-form-modal"
      >
        <VaccinationForm
          patientId={patientId}
          appointmentId={appointmentId}
          isPending={createMutation.isPending}
          globalError={formError}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title="Excluir dose"
        data-testid="vaccination-delete-dialog"
      >
        <p className="text-sm text-text-dim" data-testid="vaccination-delete-dialog-message">
          A dose sai da caderneta do paciente. Esta ação não pode ser desfeita.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeletingId(null)} data-testid="vaccination-delete-cancel">
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={deleteMutation.isPending}
            onClick={() =>
              deleteMutation.mutate(deletingId as string, { onSuccess: () => setDeletingId(null) })
            }
            data-testid="vaccination-delete-confirm"
            className="bg-danger hover:bg-danger/90"
          >
            {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
