'use client'

import { useState } from 'react'
import { AppointmentStatus, UserRole } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAppointment } from '../hooks/use-appointment.hook'
import { useCompleteAppointment } from '../hooks/use-complete-appointment.hook'
import { useCancelAppointment } from '../hooks/use-cancel-appointment.hook'
import { CancelAppointmentDialog } from './cancel-appointment-dialog'
import { APPOINTMENT_STATUS_LABELS } from '../types/appointment-model.types'
import { cn } from '@/lib/cn'
import type { IApiError } from '@/types/api.types'

const statusBadgeClass: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-accent/10 text-accent',
  [AppointmentStatus.CANCELLED]: 'bg-danger/10 text-danger',
  [AppointmentStatus.COMPLETED]: 'bg-good/10 text-good',
}

interface AppointmentDetailsDialogProps {
  appointmentId: string | null
  isOpen: boolean
  onClose: () => void
  role: UserRole
  currentDoctorId?: string
}

export function AppointmentDetailsDialog({
  appointmentId,
  isOpen,
  onClose,
  role,
  currentDoctorId,
}: AppointmentDetailsDialogProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const { data: appointment, isLoading, isError } = useAppointment(appointmentId ?? '')
  const { mutate: complete, isPending: isCompleting, error: completeError } = useCompleteAppointment()
  const { mutate: cancel, isPending: isCancelling } = useCancelAppointment()

  const canManage =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

  const canAct = canManage && appointment?.status === AppointmentStatus.SCHEDULED

  function handleComplete() {
    /* c8 ignore next */
    if (!appointmentId) return
    complete(appointmentId, { onSuccess: onClose })
  }

  function handleCancelConfirm(cancellationReason?: string) {
    /* c8 ignore next */
    if (!appointmentId) return
    cancel(
      { id: appointmentId, data: { cancellationReason } },
      {
        onSuccess: () => {
          setShowCancelDialog(false)
          onClose()
        },
      },
    )
  }

  const completeApiError = completeError as IApiError | null
  const completeErrorMessage =
    completeApiError?.status === 422
      ? 'Não é possível concluir uma consulta futura.'
      : completeApiError
        ? 'Ocorreu um erro ao concluir. Tente novamente.'
        : null

  return (
    <>
      <Modal
        isOpen={isOpen && !showCancelDialog}
        onClose={onClose}
        title="Detalhes da consulta"
        data-testid="appointment-details-dialog"
      >
        {isLoading && (
          <div data-testid="details-loading" className="py-8 text-center text-sm text-text/50">
            Carregando...
          </div>
        )}

        {isError && (
          <Alert variant="error" data-testid="details-error">
            Erro ao carregar consulta.
          </Alert>
        )}

        {appointment && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                data-testid="details-status-badge"
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  statusBadgeClass[appointment.status],
                )}
              >
                {APPOINTMENT_STATUS_LABELS[appointment.status]}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-text/50">Paciente</dt>
              <dd data-testid="details-patient">{appointment.patientName}</dd>

              <dt className="text-text/50">Médico</dt>
              <dd data-testid="details-doctor">{appointment.doctorName}</dd>

              <dt className="text-text/50">Data</dt>
              <dd data-testid="details-date">{appointment.date}</dd>

              <dt className="text-text/50">Horário</dt>
              <dd data-testid="details-time">
                {appointment.startTime} – {appointment.endTime}
              </dd>

              {appointment.reason && (
                <>
                  <dt className="text-text/50">Motivo</dt>
                  <dd data-testid="details-reason">{appointment.reason}</dd>
                </>
              )}

              {appointment.cancellationReason && (
                <>
                  <dt className="text-text/50">Motivo cancelamento</dt>
                  <dd data-testid="details-cancellation-reason">{appointment.cancellationReason}</dd>
                </>
              )}
            </dl>

            {completeErrorMessage && (
              <Alert variant="error" data-testid="details-complete-error">
                {completeErrorMessage}
              </Alert>
            )}

            {canAct && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCancelDialog(true)}
                  data-testid="details-cancel-button"
                  className="border-danger text-danger hover:bg-danger/10"
                >
                  Cancelar consulta
                </Button>
                <Button
                  type="button"
                  onClick={handleComplete}
                  isLoading={isCompleting}
                  data-testid="details-complete-button"
                >
                  Concluir
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <CancelAppointmentDialog
        isOpen={showCancelDialog}
        isPending={isCancelling}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelConfirm}
      />
    </>
  )
}
