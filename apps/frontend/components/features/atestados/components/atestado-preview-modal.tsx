'use client'

import { MedicalCertificateType } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import type { IAtestadoModel } from '../types/atestado-model.types'

interface AtestadoPreviewModalProps {
  atestado: IAtestadoModel | null
  onClose: () => void
}

export function AtestadoPreviewModal({ atestado, onClose }: AtestadoPreviewModalProps) {
  if (!atestado) return null

  const isLeave = atestado.type === MedicalCertificateType.LEAVE

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Atestado"
      className="max-w-xl"
      data-testid="atestado-preview-modal"
    >
      <div className="flex flex-col gap-3" data-testid="atestado-preview-content">
        <div className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Profissional
              </p>
              <p className="font-semibold text-text" data-testid="atestado-preview-professional">
                {atestado.professionalName}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
                Data
              </p>
              <p className="text-sm text-text" data-testid="atestado-preview-date">
                {atestado.issuedAt.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <hr className="border-line" />

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-0.5">
              Paciente
            </p>
            <p className="font-medium text-text" data-testid="atestado-preview-patient">
              {atestado.patientName}
            </p>
          </div>

          <hr className="border-line" />

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
              {isLeave ? 'Afastamento' : 'Comparecimento'}
            </p>
            {isLeave ? (
              <p className="text-sm text-text-dim" data-testid="atestado-preview-body">
                {atestado.daysOff} {atestado.daysOff === 1 ? 'dia' : 'dias'} a partir de{' '}
                {atestado.startDate?.toLocaleDateString('pt-BR')}
                {atestado.cidCode ? ` — CID: ${atestado.cidCode}` : ''}
              </p>
            ) : (
              <p className="text-sm text-text-dim" data-testid="atestado-preview-body">
                {atestado.attendanceDate?.toLocaleDateString('pt-BR')}, das {atestado.checkInTime}{' '}
                às {atestado.checkOutTime}
              </p>
            )}
          </div>

          {atestado.observations && (
            <>
              <hr className="border-line" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-mute mb-1">
                  Observações
                </p>
                <p
                  className="text-sm text-text-dim whitespace-pre-wrap"
                  data-testid="atestado-preview-observations"
                >
                  {atestado.observations}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
