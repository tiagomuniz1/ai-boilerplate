'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import type { IPrescriptionModel } from '../types/prescription-model.types'

interface PrescriptionPreviewModalProps {
  prescription: IPrescriptionModel | null
  onClose: () => void
}

export function PrescriptionPreviewModal({ prescription, onClose }: PrescriptionPreviewModalProps) {
  if (!prescription) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Receita médica"
      className="max-w-xl"
      data-testid="prescription-preview-modal"
    >
      <div className="flex flex-col gap-3" data-testid="prescription-preview-content">
        {/* Paper document */}
        <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">

          {/* Header: doctor + date */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Profissional
              </p>
              <p className="font-semibold text-text" data-testid="prescription-preview-doctor">
                {prescription.professionalName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Data
              </p>
              <p className="text-sm text-text" data-testid="prescription-preview-date">
                {prescription.issuedAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <hr className="border-line" />

          {/* Patient */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
              Paciente
            </p>
            <p className="font-medium text-text" data-testid="prescription-preview-patient">
              {prescription.patientName}
            </p>
          </div>

          <hr className="border-line" />

          {/* Medications */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute">
              Medicamentos
            </p>
            <ol className="flex flex-col gap-2" data-testid="prescription-preview-items">
              {prescription.items.map((item, index) => (
                <li
                  key={index}
                  className="rounded-lg bg-surface-2 border border-line px-4 py-3"
                  data-testid={`prescription-preview-item-${index}`}
                >
                  <p className="font-semibold text-text text-sm">
                    {index + 1}.{' '}
                    {item.dosage ? `${item.name} ${item.dosage}` : item.name}
                  </p>
                  {item.activeIngredient && (
                    <p className="mt-0.5 text-xs text-text-mute">{item.activeIngredient}</p>
                  )}
                  <p className="mt-1.5 text-sm text-text-dim">{item.instructions}</p>
                  {item.quantity && (
                    <p className="mt-1 text-xs text-text-mute">
                      Quantidade: {item.quantity}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          {/* Notes */}
          {prescription.notes && (
            <>
              <hr className="border-line" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
                  Observações
                </p>
                <p
                  className="text-sm text-text-dim whitespace-pre-wrap"
                  data-testid="prescription-preview-notes"
                >
                  {prescription.notes}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
