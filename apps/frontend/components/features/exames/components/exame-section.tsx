'use client'

import { useState } from 'react'
import { ExamRequestStatus, UserRole } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useExamRequests } from '../hooks/use-exam-requests.hook'
import { useCreateExamRequest } from '../hooks/use-create-exam-request.hook'
import { useDeleteExamRequest } from '../hooks/use-delete-exam-request.hook'
import { useDownloadExamRequestPdf } from '../hooks/use-download-exam-request-pdf.hook'
import { useDownloadExamResultFile } from '../hooks/use-download-exam-result-file.hook'
import { useAddExamResult } from '../hooks/use-add-exam-result.hook'
import { useDeleteExamResult } from '../hooks/use-delete-exam-result.hook'
import { ExameForm } from './exame-form'
import { ExameListSkeleton } from './exame-list-skeleton'
import { ExameDeleteDialog } from './exame-delete-dialog'
import { ExameResultDeleteDialog } from './exame-result-delete-dialog'
import { ExamePreviewModal } from './exame-preview-modal'
import type { IExamRequestModel } from '../types/exam-request-model.types'
import type { ICreateExamRequestInput } from '../types/exam-request-input.types'
import type { IApiError } from '@/types/api.types'

export interface ExameSectionProps {
  appointmentId: string
  canManage: boolean
  userRole: UserRole
}

const statusLabel: Record<ExamRequestStatus, string> = {
  [ExamRequestStatus.REQUESTED]: 'Solicitado',
  [ExamRequestStatus.COMPLETED]: 'Concluído',
}

export function ExameSection({ appointmentId, canManage, userRole }: ExameSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingResultId, setDeletingResultId] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const { data: examRequests, isLoading, isError } = useExamRequests(appointmentId)
  const { mutate: create, isPending: isCreating, error: createError } = useCreateExamRequest()
  const { mutate: deleteExamRequest, isPending: isDeleting } = useDeleteExamRequest(appointmentId)
  const { mutate: download, isPending: isDownloading, variables: downloadingVars } = useDownloadExamRequestPdf()
  const { mutate: addResult, isPending: isUploading, error: uploadError } = useAddExamResult(appointmentId)
  const { mutate: deleteResult, isPending: isDeletingResult } = useDeleteExamResult(appointmentId)
  const {
    mutate: downloadResultFile,
    isPending: isDownloadingResult,
    variables: downloadResultVars,
  } = useDownloadExamResultFile()

  const isDoctor = userRole === UserRole.DOCTOR
  const previewExamRequest = examRequests?.find((examRequest) => examRequest.id === previewId) ?? null

  function handleCreate(input: ICreateExamRequestInput) {
    create(input, { onSuccess: () => setShowForm(false) })
  }

  function handleDeleteConfirm() {
    // Only reachable while the delete dialog is open, which requires deletingId to be set
    // (ExameDeleteDialog's isOpen is `!!deletingId`), so deletingId is guaranteed here.
    deleteExamRequest(deletingId!, { onSuccess: () => setDeletingId(null) })
  }

  function handleDeleteResultConfirm() {
    // Only reachable while the result delete dialog is open, which requires
    // deletingResultId to be set, so deletingResultId is guaranteed here.
    deleteResult(deletingResultId!, { onSuccess: () => setDeletingResultId(null) })
  }

  const createApiError = createError as IApiError | null
  const createGlobalError =
    createApiError?.status === 422
      ? 'Não é possível solicitar exames para uma consulta cancelada.'
      : createApiError?.status === 403
        ? 'Você não tem permissão para solicitar exames nesta consulta.'
        : createApiError
          ? 'Ocorreu um erro ao solicitar os exames. Tente novamente.'
          : null

  const uploadApiError = uploadError as IApiError | null
  const uploadGlobalError =
    uploadApiError?.status === 422
      ? 'Arquivo inválido. Verifique o tipo e o tamanho (máx. 10MB).'
      : uploadApiError?.status === 403
        ? 'Você não tem permissão para anexar resultados a este pedido.'
        : uploadApiError
          ? 'Ocorreu um erro ao anexar o resultado. Tente novamente.'
          : null

  return (
    <>
      <div data-testid="exame-section">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text">Exames</h2>
            <p className="text-sm text-text-mute">Exames solicitados nesta consulta.</p>
          </div>
          {isDoctor && canManage && (
            <Button
              type="button"
              onClick={() => setShowForm(true)}
              data-testid="exame-new-button"
            >
              + Novo pedido de exames
            </Button>
          )}
        </div>

        {isLoading && <ExameListSkeleton />}

        {isError && !isLoading && (
          <Alert variant="error" data-testid="exame-section-error">
            Não foi possível carregar os exames. Tente novamente.
          </Alert>
        )}

        {!isLoading && !isError && examRequests && examRequests.length === 0 && (
          <p className="text-sm text-text-mute" data-testid="exame-section-empty">
            Nenhum exame solicitado.
          </p>
        )}

        {!isLoading && !isError && examRequests && examRequests.length > 0 && (
          <ul className="flex flex-col gap-3" data-testid="exame-section-list">
            {examRequests.map((examRequest: IExamRequestModel) => {
              const isThisDownloading = isDownloading && downloadingVars?.id === examRequest.id
              const resultsCount = examRequest.results.length

              return (
                <li
                  key={examRequest.id}
                  className="flex items-center justify-between border border-border rounded-xl bg-surface p-4 text-sm"
                  data-testid={`exame-item-${examRequest.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium" data-testid={`exame-item-date-${examRequest.id}`}>
                        {examRequest.issuedAt.toLocaleDateString('pt-BR')}{' '}
                        <span className="font-normal text-text-mute">
                          {examRequest.issuedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </span>
                      <span
                        className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          examRequest.status === ExamRequestStatus.COMPLETED
                            ? 'bg-good/10 text-good'
                            : 'bg-warn/10 text-warn'
                        }`}
                        data-testid={`exame-item-status-${examRequest.id}`}
                      >
                        {statusLabel[examRequest.status]}
                      </span>
                    </div>
                    <span className="text-xs text-text-mute" data-testid={`exame-item-summary-${examRequest.id}`}>
                      {examRequest.items.length} {examRequest.items.length === 1 ? 'exame' : 'exames'}
                      {' · '}
                      {resultsCount > 0
                        ? `${resultsCount} ${resultsCount === 1 ? 'resultado anexado' : 'resultados anexados'}`
                        : 'nenhum resultado anexado'}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewId(examRequest.id)}
                      data-testid={`exame-preview-button-${examRequest.id}`}
                    >
                      Visualizar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      isLoading={isThisDownloading}
                      disabled={isThisDownloading}
                      onClick={() => download({ id: examRequest.id, fileName: `pedido-exames-${examRequest.id}.pdf` })}
                      data-testid={`exame-download-button-${examRequest.id}`}
                    >
                      Baixar PDF
                    </Button>
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(examRequest.id)}
                        className="text-danger hover:text-danger"
                        data-testid={`exame-delete-button-${examRequest.id}`}
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
        title="Novo pedido de exames"
        data-testid="exame-form-modal"
      >
        <ExameForm
          appointmentId={appointmentId}
          isPending={isCreating}
          globalError={createGlobalError}
          onSubmit={handleCreate}
        />
      </Modal>

      <ExamePreviewModal
        examRequest={previewExamRequest}
        onClose={() => setPreviewId(null)}
        canManageResults={isDoctor && canManage}
        isUploading={isUploading}
        uploadError={uploadGlobalError}
        onUpload={(files) => previewId && addResult({ examRequestId: previewId, files })}
        onRemoveResult={(resultId) => setDeletingResultId(resultId)}
        onDownloadResult={(resultId, fileName) => downloadResultFile({ id: resultId, fileName })}
        isDownloadingResultId={isDownloadingResult ? (downloadResultVars?.id ?? null) : null}
      />

      <ExameDeleteDialog
        isOpen={!!deletingId}
        isPending={isDeleting}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <ExameResultDeleteDialog
        isOpen={!!deletingResultId}
        isPending={isDeletingResult}
        onClose={() => setDeletingResultId(null)}
        onConfirm={handleDeleteResultConfirm}
      />
    </>
  )
}
