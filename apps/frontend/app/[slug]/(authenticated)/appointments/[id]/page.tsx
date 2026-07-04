'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppointmentStatus, UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Tabs } from '@/components/ui/atoms/tabs/tabs'
import { useAppointment } from '@/components/features/appointments/hooks/use-appointment.hook'
import { useCompleteAppointment } from '@/components/features/appointments/hooks/use-complete-appointment.hook'
import { useCancelAppointment } from '@/components/features/appointments/hooks/use-cancel-appointment.hook'
import { useDoctors } from '@/components/features/doctors/hooks/use-doctors.hook'
import { usePrescriptions } from '@/components/features/prescriptions/hooks/use-prescriptions.hook'
import { useAtestados } from '@/components/features/atestados/hooks/use-atestados.hook'
import { useExamRequests } from '@/components/features/exames/hooks/use-exam-requests.hook'
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { AppointmentHeaderCard } from '@/components/features/appointments/components/appointment-header-card'
import { ResumoTab } from '@/components/features/appointments/components/resumo-tab'
import { MedicalRecordSection } from '@/components/features/appointments/components/medical-record-section'
import { PrescriptionSection } from '@/components/features/prescriptions/components/prescription-section'
import { AtestadoSection } from '@/components/features/atestados/components/atestado-section'
import { ExameSection } from '@/components/features/exames/components/exame-section'
import { CancelAppointmentDialog } from '@/components/features/appointments/components/cancel-appointment-dialog'
import type { IApiError } from '@/types/api.types'

type TabId = 'resumo' | 'prontuario' | 'receitas' | 'atestados' | 'exames'

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)
  const role = currentUser?.role ?? UserRole.USER

  const isDoctor = role === UserRole.DOCTOR
  const { data: doctors } = useDoctors({ limit: 100 })
  const currentDoctorId = isDoctor ? doctors?.[0]?.id : undefined

  const { data: appointment, isLoading, isError } = useAppointment(id)

  const { mutate: complete, isPending: isCompleting, error: completeError } = useCompleteAppointment()
  const { mutate: cancel, isPending: isCancelling } = useCancelAppointment()

  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const canManage =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

  const canSeeMedicalRecord =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

  const canAct = canManage && appointment?.status === AppointmentStatus.SCHEDULED

  const { data: prescriptions } = usePrescriptions(id)
  const { data: atestados } = useAtestados(id)
  const { data: examRequests } = useExamRequests(id)
  const { data: record } = useMedicalRecordByAppointment(canSeeMedicalRecord ? id : '')

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

  const tabItems = [
    { id: 'resumo', label: 'Resumo' },
    ...(canSeeMedicalRecord ? [{ id: 'prontuario', label: 'Prontuário' }] : []),
    ...(canManage
      ? [{ id: 'receitas', label: 'Receitas', count: prescriptions?.length ?? 0 }]
      : []),
    ...(canManage
      ? [{ id: 'atestados', label: 'Atestados', count: atestados?.length ?? 0 }]
      : []),
    ...(canManage
      ? [{ id: 'exames', label: 'Exames', count: examRequests?.length ?? 0 }]
      : []),
  ]

  return (
    <>
      <main className="p-4 sm:p-6 max-w-5xl pb-24 sm:pb-6" data-testid="appointment-detail-page">
        <div className="mb-4">
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
          <div className="flex flex-col gap-4" data-testid="appointment-detail-skeleton">
            <Skeleton height={120} className="w-full rounded-xl" />
            <Skeleton height={40} className="w-full" />
            <Skeleton height={200} className="w-full rounded-xl" />
          </div>
        )}

        {isError && (
          <Alert variant="error" data-testid="appointment-detail-error">
            Não foi possível carregar os dados da consulta. Verifique o ID e tente novamente.
          </Alert>
        )}

        {appointment && !isLoading && (
          <>
            <AppointmentHeaderCard
              appointment={appointment}
              canManage={canManage}
              canAct={!!canAct}
              hasRecord={!!record}
              onFillRecord={() => setActiveTab('prontuario')}
              onCancel={() => setShowCancelDialog(true)}
              onComplete={handleComplete}
              isPendingComplete={isCompleting}
              isPendingCancel={isCancelling}
            />

            {completeErrorMessage && (
              <Alert variant="error" data-testid="appointment-detail-complete-error" className="mb-4">
                {completeErrorMessage}
              </Alert>
            )}

            <Tabs
              items={tabItems}
              activeId={activeTab}
              onChange={(id) => setActiveTab(id as TabId)}
              data-testid="appointment-tabs"
            />

            <div className="mt-4">
              {activeTab === 'resumo' && (
                <ResumoTab
                  patient={appointment.patient}
                  prescriptionCount={canManage ? (prescriptions?.length ?? 0) : undefined}
                  showPrescriptions={canManage}
                  certificateCount={canManage ? (atestados?.length ?? 0) : undefined}
                  showCertificates={canManage}
                  examCount={canManage ? (examRequests?.length ?? 0) : undefined}
                  showExames={canManage}
                  onNavigate={(tab) => setActiveTab(tab as TabId)}
                />
              )}

              {activeTab === 'prontuario' && canSeeMedicalRecord && (
                <MedicalRecordSection
                  appointmentId={id}
                  specialtyId={appointment.specialtyId}
                  appointmentStatus={appointment.status}
                  canManage={canManage}
                />
              )}

              {activeTab === 'receitas' && canManage && (
                <PrescriptionSection
                  appointmentId={id}
                  canManage={canManage}
                  userRole={role}
                />
              )}

              {activeTab === 'atestados' && canManage && (
                <AtestadoSection
                  appointmentId={id}
                  canManage={canManage}
                  userRole={role}
                />
              )}

              {activeTab === 'exames' && canManage && (
                <ExameSection
                  appointmentId={id}
                  canManage={canManage}
                  userRole={role}
                />
              )}
            </div>
          </>
        )}

        {/* Mobile sticky action bar */}
        {appointment && canAct && (
          <div className="fixed bottom-0 inset-x-0 flex gap-3 bg-surface border-t border-border p-4 sm:hidden">
            <Button
              type="button"
              variant="ghost"
              isLoading={isCancelling}
              disabled={isCancelling || isCompleting}
              onClick={() => setShowCancelDialog(true)}
              className="flex-1 text-danger hover:bg-danger/10"
              data-testid="appointment-detail-cancel-button-mobile"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              isLoading={isCompleting}
              disabled={isCancelling || isCompleting}
              onClick={handleComplete}
              className="flex-1"
              data-testid="appointment-detail-complete-button-mobile"
            >
              Concluir consulta
            </Button>
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
