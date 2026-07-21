'use client'

import { ExamRequestStatus } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { ExameResultUpload } from './exame-result-upload'
import type { IExamRequestModel } from '../types/exam-request-model.types'

const statusLabel: Record<ExamRequestStatus, string> = {
  [ExamRequestStatus.REQUESTED]: 'Solicitado',
  [ExamRequestStatus.COMPLETED]: 'Concluído',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ExamePreviewModalProps {
  examRequest: IExamRequestModel | null
  onClose: () => void
  canManageResults: boolean
  isUploading: boolean
  uploadError: string | null
  onUpload: (files: File[]) => void
  onRemoveResult: (resultId: string) => void
  onDownloadResult: (resultId: string, fileName: string) => void
  isDownloadingResultId: string | null
}

export function ExamePreviewModal({
  examRequest,
  onClose,
  canManageResults,
  isUploading,
  uploadError,
  onUpload,
  onRemoveResult,
  onDownloadResult,
  isDownloadingResultId,
}: ExamePreviewModalProps) {
  if (!examRequest) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Pedido de exames"
      className="max-w-xl"
      data-testid="exame-preview-modal"
    >
      <div className="flex flex-col gap-3" data-testid="exame-preview-content">
        <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Profissional
              </p>
              <p className="font-semibold text-text" data-testid="exame-preview-professional">
                {examRequest.professionalName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Data
              </p>
              <p className="text-sm text-text" data-testid="exame-preview-date">
                {examRequest.issuedAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <hr className="border-line" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Paciente
              </p>
              <p className="font-medium text-text" data-testid="exame-preview-patient">
                {examRequest.patientName}
              </p>
            </div>
            <span
              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                examRequest.status === ExamRequestStatus.COMPLETED
                  ? 'bg-good/10 text-good'
                  : 'bg-warn/10 text-warn'
              }`}
              data-testid="exame-preview-status"
            >
              {statusLabel[examRequest.status]}
            </span>
          </div>

          <hr className="border-line" />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute">
              Exames solicitados
            </p>
            <ol className="flex flex-col gap-2" data-testid="exame-preview-items">
              {examRequest.items.map((item, index) => (
                <li
                  key={index}
                  className="rounded-lg bg-surface-2 border border-line px-4 py-3"
                  data-testid={`exame-preview-item-${index}`}
                >
                  <p className="font-semibold text-text text-sm">
                    {index + 1}. {item.name}
                  </p>
                  {item.observations && (
                    <p className="mt-1 text-sm text-text-dim">{item.observations}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {examRequest.notes && (
            <>
              <hr className="border-line" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
                  Observações gerais
                </p>
                <p
                  className="text-sm text-text-dim whitespace-pre-wrap"
                  data-testid="exame-preview-notes"
                >
                  {examRequest.notes}
                </p>
              </div>
            </>
          )}

          <hr className="border-line" />

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute">
              Resultados
            </p>

            {examRequest.results.length === 0 && (
              <p className="text-sm text-text-mute" data-testid="exame-preview-results-empty">
                Nenhum resultado anexado ainda.
              </p>
            )}

            {examRequest.results.length > 0 && (
              <ul className="flex flex-col gap-2" data-testid="exame-preview-results">
                {examRequest.results.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 border border-line px-4 py-3"
                    data-testid={`exame-result-${result.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => onDownloadResult(result.id, result.fileName)}
                      disabled={isDownloadingResultId === result.id}
                      className="text-accent hover:underline text-sm font-medium truncate text-left disabled:opacity-50"
                      data-testid={`exame-result-link-${result.id}`}
                    >
                      {result.fileName}
                    </button>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-text-mute">{formatFileSize(result.fileSizeBytes)}</span>
                      {canManageResults && (
                        <button
                          type="button"
                          onClick={() => onRemoveResult(result.id)}
                          className="text-danger text-xs hover:underline"
                          data-testid={`exame-result-remove-${result.id}`}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {uploadError && (
              <p className="text-xs text-danger" data-testid="exame-preview-upload-error">
                {uploadError}
              </p>
            )}

            {canManageResults && (
              <div className="mt-1">
                <ExameResultUpload isPending={isUploading} onUpload={onUpload} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
