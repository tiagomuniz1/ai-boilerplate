'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppointmentStatus, UserRole } from '@app/shared'
import { useSlug } from '@/lib/slug-context'
import { useAuthStore } from '@/stores/auth.store'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { cn } from '@/lib/cn'
import { useAppointment } from '@/components/features/appointments/hooks/use-appointment.hook'
import { useCompleteAppointment } from '@/components/features/appointments/hooks/use-complete-appointment.hook'
import { useCancelAppointment } from '@/components/features/appointments/hooks/use-cancel-appointment.hook'
import { useDoctors } from '@/components/features/doctors/hooks/use-doctors.hook'
import { PatientInfoCard } from '@/components/features/appointments/components/patient-info-card'
import { MedicalRecordSection } from '@/components/features/appointments/components/medical-record-section'
import { PrescriptionSection } from '@/components/features/prescriptions/components/prescription-section'
import { CancelAppointmentDialog } from '@/components/features/appointments/components/cancel-appointment-dialog'
import {
  APPOINTMENT_STATUS_LABELS,
} from '@/components/features/appointments/types/appointment-model.types'
import type { IApiError } from '@/types/api.types'

const statusBadgeClass: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-accent/10 text-accent',
  [AppointmentStatus.CONFIRMED]: 'bg-accent/20 text-accent',
  [AppointmentStatus.CANCELLED]: 'bg-danger/10 text-danger',
  [AppointmentStatus.COMPLETED]: 'bg-good/10 text-good',
  [AppointmentStatus.NO_SHOW]: 'bg-warn/10 text-warn',
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const slug = useSlug()
  const currentUser = useAuthStore((s) => s.user)
  const role = currentUser?.role ?? UserRole.USER

  const isDoctor = role === UserRole.DOCTOR
  const { data: doctors } = useDoctors({ limit: 100 })
  const currentDoctorId = isDoctor ? doctors?.[0]?.id : undefined

  const { data: appointment, isLoading, isError } = useAppointment(id)
  const { mutate: complete, isPending: isCompleting, error: completeError } = useCompleteAppointment()
  const { mutate: cancel, isPending: isCancelling } = useCancelAppointment()

  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const canManage =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

  const canSeeMedicalRecord =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

  const canAct = canManage && appointment?.status === AppointmentStatus.SCHEDULED

  const completeApiError = completeError as IApiError | null
  const completeErrorMessage =
    completeApiError?.status === 422
      ? 'Não é possível concluir uma consulta futura.'
      : completeApiError
        ? 'Ocorreu um erro ao concluir. Tente novamente.'
        : null

  function handleComplete() {
    complete(id, { onSuccess: undefined })
  }

  function handleCancelConfirm(cancellationReason?: string) {
    cancel(
      { id, data: { cancellationReason } },
      {
        onSuccess: () => setShowCancelDialog(false),
      },
    )
  }

  return (
    <>
      <main className="p-6 max-w-4xl" data-testid="appointment-detail-page">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            data-testid="appointment-detail-back-button"
          >
            ← Voltar
          </Button>
        </div>

        {isLoading && (
          <div className="flex flex-col gap-6" data-testid="appointment-detail-skeleton">
            <Skeleton height={28} className="w-48" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={40} className="w-full" />
              ))}
            </div>
            <Skeleton height={28} className="w-48" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={40} className="w-full" />
              ))}
            </div>
          </div>
        )}

        {isError && (
          <Alert variant="error" data-testid="appointment-detail-error">
            Não foi possível carregar os dados da consulta. Verifique o ID e tente novamente.
          </Alert>
        )}

        {appointment && !isLoading && (
          <div className="flex flex-col gap-8">
            <section data-testid="appointment-detail-summary">
              <div className="flex items-center justify-between mb-4 gap-4">
                <h1 className="text-xl font-semibold text-text">Consulta</h1>
                <span
                  data-testid="appointment-detail-status"
                  className={cn(
                    'text-xs font-medium px-2 py-1 rounded-full',
                    statusBadgeClass[appointment.status],
                  )}
                >
                  {APPOINTMENT_STATUS_LABELS[appointment.status]}
                </span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                    Médico
                  </dt>
                  <dd data-testid="appointment-detail-doctor">{appointment.doctorName}</dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                    Data
                  </dt>
                  <dd data-testid="appointment-detail-date">{appointment.date}</dd>
                </div>

                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                    Horário
                  </dt>
                  <dd data-testid="appointment-detail-time">
                    {appointment.startTime} – {appointment.endTime}
                  </dd>
                </div>

                {appointment.specialtyName && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                      Especialidade
                    </dt>
                    <dd data-testid="appointment-detail-specialty">{appointment.specialtyName}</dd>
                  </div>
                )}

                {appointment.reason && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                      Motivo
                    </dt>
                    <dd data-testid="appointment-detail-reason">{appointment.reason}</dd>
                  </div>
                )}

                {appointment.cancellationReason && (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                      Motivo cancelamento
                    </dt>
                    <dd data-testid="appointment-detail-cancellation-reason">
                      {appointment.cancellationReason}
                    </dd>
                  </div>
                )}
              </dl>

              {completeErrorMessage && (
                <Alert variant="error" data-testid="appointment-detail-complete-error" className="mt-4">
                  {completeErrorMessage}
                </Alert>
              )}

              {canAct && (
                <div className="flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowCancelDialog(true)}
                    data-testid="appointment-detail-cancel-button"
                    className="border-danger text-danger hover:bg-danger/10"
                  >
                    Cancelar consulta
                  </Button>
                  <Button
                    type="button"
                    onClick={handleComplete}
                    isLoading={isCompleting}
                    data-testid="appointment-detail-complete-button"
                  >
                    Concluir
                  </Button>
                </div>
              )}
            </section>

            <PatientInfoCard patient={appointment.patient} />

            {canSeeMedicalRecord && (
              <section>
                <h2 className="text-base font-semibold text-text mb-4">Prontuário</h2>
                <MedicalRecordSection
                  appointmentId={id}
                  specialtyId={appointment.specialtyId}
                  appointmentStatus={appointment.status}
                  canManage={canManage}
                />
              </section>
            )}

            {canManage && (
              <section data-testid="prescription-section-wrapper">
                <h2 className="text-base font-semibold text-text mb-4">Receitas</h2>
                <PrescriptionSection
                  appointmentId={id}
                  canManage={canManage}
                  userRole={role}
                />
              </section>
            )}
          </div>
        )}
      </main>

      {appointment && (
        <CancelAppointmentDialog
          isOpen={showCancelDialog}
          isPending={isCancelling}
          onClose={() => setShowCancelDialog(false)}
          onConfirm={handleCancelConfirm}
        />
      )}
    </>
  )
}
