'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useVaccineIndications } from '../hooks/use-vaccine-indications.hook'
import { useCreateVaccineIndication } from '../hooks/use-create-vaccine-indication.hook'
import { useDeleteVaccineIndication } from '../hooks/use-delete-vaccine-indication.hook'
import { useDownloadVaccineIndicationPdf } from '../hooks/use-download-vaccine-indication-pdf.hook'
import { VaccineIndicationForm } from './vaccine-indication-form'
import { VaccineIndicationListSkeleton } from './vaccine-indication-list-skeleton'
import { VaccineIndicationDeleteDialog } from './vaccine-indication-delete-dialog'
import type { IVaccineIndicationModel } from '../types/vaccine-indication-model.types'
import type { ICreateVaccineIndicationInput } from '../types/vaccine-indication-input.types'
import type { IApiError } from '@/types/api.types'

export interface VaccineIndicationSectionProps {
  appointmentId: string
  canManage: boolean
  /** Indicar vem da ficha de profissional e só na própria consulta — não do cargo. */
  canIssue: boolean
}

export function VaccineIndicationSection({
  appointmentId,
  canManage,
  canIssue,
}: VaccineIndicationSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { data: indications, isLoading, isError } = useVaccineIndications(appointmentId)
  const { mutate: create, isPending: isCreating, error: createError } = useCreateVaccineIndication()
  const { mutate: deleteIndication, isPending: isDeleting } = useDeleteVaccineIndication(appointmentId)
  const { mutate: download, isPending: isDownloading, variables: downloadingVars } =
    useDownloadVaccineIndicationPdf()

  function handleCreate(input: ICreateVaccineIndicationInput) {
    create(input, { onSuccess: () => setShowForm(false) })
  }

  function handleDeleteConfirm() {
    // Só alcançável com o diálogo aberto, que exige deletingId.
    deleteIndication(deletingId!, { onSuccess: () => setDeletingId(null) })
  }

  const createApiError = createError as IApiError | null
  const createGlobalError =
    createApiError?.status === 422
      ? 'Não é possível emitir indicação para uma consulta cancelada ou com vacina fora do catálogo.'
      : createApiError?.status === 403
        ? 'Você não tem permissão para emitir esta indicação.'
        : createApiError
          ? 'Ocorreu um erro ao emitir a indicação. Tente novamente.'
          : null

  return (
    <>
      <div data-testid="vaccine-indication-section">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Indicações de vacina</h2>
            <p className="text-sm text-text-mute">
              Vacinas indicadas nesta consulta, para aplicação em serviço de imunização.
            </p>
          </div>
          {canIssue && canManage && (
            <Button type="button" onClick={() => setShowForm(true)} data-testid="vaccine-indication-new-button">
              + Nova indicação
            </Button>
          )}
        </div>

        {isLoading && <VaccineIndicationListSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="vaccine-indication-section-error">
            Não foi possível carregar as indicações. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && indications && indications.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="vaccine-indication-section-empty">
            Nenhuma indicação emitida.
          </p>
        )}

        {!isLoading && !isError && indications && indications.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="vaccine-indication-section-list">
            {indications.map((indication: IVaccineIndicationModel) => {
              const isThisDownloading = isDownloading && downloadingVars?.id === indication.id
              return (
                <li
                  key={indication.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`vaccine-indication-item-${indication.id}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" data-testid={`vaccine-indication-item-date-${indication.id}`}>
                      {indication.issuedAt.toLocaleDateString('pt-BR')}{' '}
                      <span className="font-normal text-text-mute">
                        {indication.issuedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    {/* Nomes, não a contagem: a indicação costuma ter duas ou três
                        vacinas, e ler "3 vacinas" obriga a abrir o PDF pra saber quais. */}
                    <span
                      className="text-xs text-text-mute"
                      data-testid={`vaccine-indication-item-vaccines-${indication.id}`}
                    >
                      {indication.items
                        .map((item) => (item.abbreviation ? `${item.name} (${item.abbreviation})` : item.name))
                        .join(', ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={isThisDownloading}
                      disabled={isThisDownloading}
                      onClick={() =>
                        download({ id: indication.id, fileName: `indicacao-vacina-${indication.id}.pdf` })
                      }
                      data-testid={`vaccine-indication-download-button-${indication.id}`}
                    >
                      Baixar PDF
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(indication.id)}
                        className="text-danger hover:text-danger"
                        data-testid={`vaccine-indication-delete-button-${indication.id}`}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova indicação de vacina"
        data-testid="vaccine-indication-form-modal"
      >
        <VaccineIndicationForm
          appointmentId={appointmentId}
          isPending={isCreating}
          globalError={createGlobalError}
          onSubmit={handleCreate}
        />
      </Modal>

      <VaccineIndicationDeleteDialog
        isOpen={!!deletingId}
        isPending={isDeleting}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
