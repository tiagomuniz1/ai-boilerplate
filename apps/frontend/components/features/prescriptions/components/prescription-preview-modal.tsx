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
      title="Visualizar receita"
      className="max-w-lg"
      data-testid="prescription-preview-modal"
    >
      <div className="flex flex-col gap-4 text-sm" data-testid="prescription-preview-content">
        <div className="flex justify-between text-xs text-text-mute">
          <span data-testid="prescription-preview-doctor">{prescription.doctorName}</span>
          <span data-testid="prescription-preview-date">
            {prescription.issuedAt.toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-text-mute mb-1">Paciente</p>
          <p data-testid="prescription-preview-patient">{prescription.patientName}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-text-mute mb-2">Medicamentos</p>
          <ol className="flex flex-col gap-3 list-none" data-testid="prescription-preview-items">
            {prescription.items.map((item, index) => (
              <li key={index} data-testid={`prescription-preview-item-${index}`}>
                <p className="font-medium">
                  {index + 1}.{' '}
                  {item.dosage ? `${item.name} ${item.dosage}` : item.name}
                </p>
                {item.quantity && (
                  <p className="ml-4 text-xs text-text-mute">Quantidade: {item.quantity}</p>
                )}
                <p className="ml-4 mt-0.5 text-text-mute">{item.instructions}</p>
              </li>
            ))}
          </ol>
        </div>

        {prescription.notes && (
          <div>
            <p className="text-xs font-semibold uppercase text-text-mute mb-1">Observações</p>
            <p className="whitespace-pre-wrap" data-testid="prescription-preview-notes">
              {prescription.notes}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
