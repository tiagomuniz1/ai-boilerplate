'use client'

import { useState } from 'react'
import { MedicalCertificateType, UserRole } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { formatDateToBR } from '@/lib/format-date'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAtestados } from '../hooks/use-atestados.hook'
import { useCreateAtestado } from '../hooks/use-create-atestado.hook'
import { useDeleteAtestado } from '../hooks/use-delete-atestado.hook'
import { useDownloadAtestadoPdf } from '../hooks/use-download-atestado-pdf.hook'
import { AtestadoForm } from './atestado-form'
import { AtestadoListSkeleton } from './atestado-list-skeleton'
import { AtestadoDeleteDialog } from './atestado-delete-dialog'
import { AtestadoPreviewModal } from './atestado-preview-modal'
import type { IAtestadoModel } from '../types/atestado-model.types'
import type { ICreateAtestadoInput } from '../types/atestado-input.types'
import type { IApiError } from '@/types/api.types'

export interface AtestadoSectionProps {
  appointmentId: string
  professionalId: string
  canManage: boolean
  userRole: UserRole
}

function atestadoTitle(atestado: IAtestadoModel): string {
  if (atestado.type === MedicalCertificateType.LEAVE) {
    const dayLabel = atestado.daysOff === 1 ? 'dia' : 'dias'
    return `Afastamento — ${atestado.daysOff} ${dayLabel}`
  }
  return 'Comparecimento'
}

function atestadoDate(atestado: IAtestadoModel): string {
  const date = atestado.type === MedicalCertificateType.LEAVE ? atestado.startDate : atestado.attendanceDate
  return date ? formatDateToBR(date) : ''
}

function atestadoDetail(atestado: IAtestadoModel): string | null {
  if (atestado.type === MedicalCertificateType.LEAVE) {
    return atestado.cidCode ? `CID ${atestado.cidCode}` : null
  }
  if (atestado.checkInTime && atestado.checkOutTime) {
    return `Entrada ${atestado.checkInTime} · Saída ${atestado.checkOutTime}`
  }
  return null
}

export function AtestadoSection({ appointmentId, professionalId, canManage, userRole }: AtestadoSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewAtestado, setPreviewAtestado] = useState<IAtestadoModel | null>(null)

  const { data: atestados, isLoading, isError } = useAtestados(appointmentId)
  const { mutate: create, isPending: isCreating, error: createError } = useCreateAtestado()
  const { mutate: deleteAtestado, isPending: isDeleting } = useDeleteAtestado(appointmentId)
  const { mutate: download, isPending: isDownloading, variables: downloadingVars } = useDownloadAtestadoPdf()

  const isProfessional = userRole === UserRole.PROFESSIONAL

  function handleCreate(input: ICreateAtestadoInput) {
    create(input, { onSuccess: () => setShowForm(false) })
  }

  function handleDeleteConfirm() {
    // Only reachable while the delete dialog is open, which requires deletingId to be set
    // (AtestadoDeleteDialog's isOpen is `!!deletingId`), so deletingId is guaranteed here.
    deleteAtestado(deletingId!, { onSuccess: () => setDeletingId(null) })
  }

  const createApiError = createError as IApiError | null
  const createGlobalError =
    createApiError?.status === 422
      ? 'Não é possível emitir atestado para uma consulta cancelada.'
      : createApiError?.status === 403
        ? 'Você não tem permissão para emitir este atestado.'
        : createApiError
          ? 'Ocorreu um erro ao emitir o atestado. Tente novamente.'
          : null

  return (
    <>
      <div data-testid="atestado-section">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Atestados</h2>
            <p className="text-sm text-text-mute">Atestados emitidos nesta consulta.</p>
          </div>
          {isProfessional && canManage && (
            <Button
              type="button"
              onClick={() => setShowForm(true)}
              data-testid="atestado-new-button"
            >
              <span className="sm:hidden">+ Novo</span>
              <span className="hidden sm:inline">+ Novo atestado</span>
            </Button>
          )}
        </div>

        {isLoading && <AtestadoListSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="atestado-section-error">
            Não foi possível carregar os atestados. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && atestados && atestados.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="atestado-section-empty">
            Nenhum atestado emitido.
          </p>
        )}

        {!isLoading && !isError && atestados && atestados.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="atestado-section-list">
            {atestados.map((atestado: IAtestadoModel) => {
              const isThisDownloading = isDownloading && downloadingVars?.id === atestado.id
              return (
                <li
                  key={atestado.id}
                  className="flex flex-col gap-3 border border-border rounded-xl bg-surface p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                  data-testid={`atestado-item-${atestado.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-good/10 text-good"
                        data-testid={`atestado-item-badge-${atestado.id}`}
                      >
                        Emitido
                      </span>
                      <span className="text-xs text-text-mute" data-testid={`atestado-item-date-${atestado.id}`}>
                        {atestadoDate(atestado)}
                      </span>
                    </div>
                    <span className="font-medium" data-testid={`atestado-item-type-${atestado.id}`}>
                      {atestadoTitle(atestado)}
                    </span>
                    {atestadoDetail(atestado) && (
                      <span className="text-xs text-text-mute" data-testid={`atestado-item-summary-${atestado.id}`}>
                        {atestadoDetail(atestado)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewAtestado(atestado)}
                      data-testid={`atestado-preview-button-${atestado.id}`}
                    >
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={isThisDownloading}
                      disabled={isThisDownloading}
                      onClick={() => download({ id: atestado.id, fileName: `atestado-${atestado.id}.pdf` })}
                      data-testid={`atestado-download-button-${atestado.id}`}
                    >
                      Baixar PDF
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(atestado.id)}
                        className="text-danger hover:text-danger"
                        data-testid={`atestado-delete-button-${atestado.id}`}
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
        title="Novo atestado"
        data-testid="atestado-form-modal"
      >
        <AtestadoForm
          appointmentId={appointmentId}
          professionalId={professionalId}
          isPending={isCreating}
          globalError={createGlobalError}
          onSubmit={handleCreate}
        />
      </Modal>

      <AtestadoDeleteDialog
        isOpen={!!deletingId}
        isPending={isDeleting}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <AtestadoPreviewModal
        atestado={previewAtestado}
        onClose={() => setPreviewAtestado(null)}
      />
    </>
  )
}
