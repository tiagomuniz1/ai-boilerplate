'use client'

import { useState } from 'react'
import { UserRole } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { usePrescriptions } from '../hooks/use-prescriptions.hook'
import { useCreatePrescription } from '../hooks/use-create-prescription.hook'
import { useDeletePrescription } from '../hooks/use-delete-prescription.hook'
import { useDownloadPrescriptionPdf } from '../hooks/use-download-prescription-pdf.hook'
import { PrescriptionForm } from './prescription-form'
import { PrescriptionListSkeleton } from './prescription-list-skeleton'
import { PrescriptionDeleteDialog } from './prescription-delete-dialog'
import { PrescriptionPreviewModal } from './prescription-preview-modal'
import type { IPrescriptionModel } from '../types/prescription-model.types'
import type { ICreatePrescriptionInput } from '../types/prescription-input.types'
import type { IApiError } from '@/types/api.types'

export interface PrescriptionSectionProps {
  appointmentId: string
  canManage: boolean
  userRole: UserRole
}

export function PrescriptionSection({ appointmentId, canManage, userRole }: PrescriptionSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [previewPrescription, setPreviewPrescription] = useState<IPrescriptionModel | null>(null)

  const { data: prescriptions, isLoading, isError } = usePrescriptions(appointmentId)
  const { mutate: create, isPending: isCreating, error: createError } = useCreatePrescription()
  const { mutate: deletePrescription, isPending: isDeleting } = useDeletePrescription(appointmentId)
  const { mutate: download, isPending: isDownloading, variables: downloadingVars } = useDownloadPrescriptionPdf()

  const isDoctor = userRole === UserRole.DOCTOR

  function handleCreate(input: ICreatePrescriptionInput) {
    create(input, { onSuccess: () => setShowForm(false) })
  }

  function handleDeleteConfirm() {
    if (!deletingId) return
    deletePrescription(deletingId, { onSuccess: () => setDeletingId(null) })
  }

  const createApiError = createError as IApiError | null
  const createGlobalError =
    createApiError?.status === 422
      ? 'Não é possível emitir receita para uma consulta cancelada.'
      : createApiError?.status === 403
        ? 'Você não tem permissão para emitir esta receita.'
        : createApiError
          ? 'Ocorreu um erro ao emitir a receita. Tente novamente.'
          : null

  return (
    <>
      <div data-testid="prescription-section">
        {isLoading && <PrescriptionListSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="prescription-section-error">
            Não foi possível carregar as receitas. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && prescriptions && prescriptions.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="prescription-section-empty">
            Nenhuma receita emitida.
          </p>
        )}

        {!isLoading && !isError && prescriptions && prescriptions.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="prescription-section-list">
            {prescriptions.map((rx: IPrescriptionModel) => {
              const isThisDownloading = isDownloading && downloadingVars?.id === rx.id
              return (
                <li
                  key={rx.id}
                  className="flex items-center justify-between border border-border rounded p-3 text-sm"
                  data-testid={`prescription-item-${rx.id}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium" data-testid={`prescription-item-date-${rx.id}`}>
                      {rx.issuedAt.toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs text-text-mute" data-testid={`prescription-item-count-${rx.id}`}>
                      {rx.items.length} {rx.items.length === 1 ? 'medicamento' : 'medicamentos'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPrescription(rx)}
                      data-testid={`prescription-preview-button-${rx.id}`}
                    >
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={isThisDownloading}
                      disabled={isThisDownloading}
                      onClick={() => download({ id: rx.id, fileName: `receita-${rx.id}.pdf` })}
                      data-testid={`prescription-download-button-${rx.id}`}
                    >
                      Baixar PDF
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(rx.id)}
                        className="text-danger hover:text-danger"
                        data-testid={`prescription-delete-button-${rx.id}`}
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

        {isDoctor && canManage && (
          <div className="mt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(true)}
              data-testid="prescription-new-button"
              className="text-sm"
            >
              Nova receita
            </Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Nova receita"
        data-testid="prescription-form-modal"
      >
        <PrescriptionForm
          appointmentId={appointmentId}
          isPending={isCreating}
          globalError={createGlobalError}
          onSubmit={handleCreate}
        />
      </Modal>

      <PrescriptionDeleteDialog
        isOpen={!!deletingId}
        isPending={isDeleting}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <PrescriptionPreviewModal
        prescription={previewPrescription}
        onClose={() => setPreviewPrescription(null)}
      />
    </>
  )
}
