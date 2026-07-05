'use client'

import { UserRole } from '@app/shared'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useSlug } from '@/lib/slug-context'
import { cn } from '@/lib/cn'
import { useAppointment } from '../hooks/use-appointment.hook'
import { APPOINTMENT_STATUS_LABELS } from '../types/appointment-model.types'
import { APPOINTMENT_STATUS_BADGE_CLASS } from '@/lib/appointment-status'

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
  role: _role,
  currentDoctorId: _currentDoctorId,
}: AppointmentDetailsDialogProps) {
  const router = useRouter()
  const slug = useSlug()
  const { data: appointment, isLoading, isError } = useAppointment(appointmentId ?? '')

  function handleGoToAppointment() {
    // Only reachable once `appointment` has loaded below, which requires a non-null appointmentId
    // (useAppointment is disabled otherwise), so appointmentId is guaranteed here.
    router.push(`/${slug}/appointments/${appointmentId}`)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
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
                APPOINTMENT_STATUS_BADGE_CLASS[appointment.status],
              )}
            >
              {APPOINTMENT_STATUS_LABELS[appointment.status]}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
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

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={handleGoToAppointment}
              data-testid="go-to-appointment-button"
            >
              Ir para a consulta
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
