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
import { useReassignAppointment } from '@/components/features/appointments/hooks/use-reassign-appointment.hook'
import { useMyProfessional } from '@/components/features/professionals/hooks/use-my-professional.hook'
import { usePrescriptions } from '@/components/features/prescriptions/hooks/use-prescriptions.hook'
import { useVaccineIndications } from '@/components/features/vaccine-indications/hooks/use-vaccine-indications.hook'
import { useAtestados } from '@/components/features/atestados/hooks/use-atestados.hook'
import { useExamRequests } from '@/components/features/exames/hooks/use-exam-requests.hook'
import { useAppointmentPhotos } from '@/components/features/consultation-photos/hooks/use-appointment-photos.hook'
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { AppointmentHeaderCard } from '@/components/features/appointments/components/appointment-header-card'
import { ResumoTab } from '@/components/features/appointments/components/resumo-tab'
import { MedicalRecordSection } from '@/components/features/appointments/components/medical-record-section'
import { PrescriptionSection } from '@/components/features/prescriptions/components/prescription-section'
import { VaccineIndicationSection } from '@/components/features/vaccine-indications/components/vaccine-indication-section'
import { AtestadoSection } from '@/components/features/atestados/components/atestado-section'
import { ExameSection } from '@/components/features/exames/components/exame-section'
import { PhotoSection } from '@/components/features/consultation-photos/components/photo-section'
import { CancelAppointmentDialog } from '@/components/features/appointments/components/cancel-appointment-dialog'
import type { ICancelConfirmInput } from '@/components/features/appointments/components/cancel-appointment-dialog'
import { SeriesOccurrencesDialog } from '@/components/features/appointments/components/series-occurrences-dialog'
import { CompleteAppointmentDialog } from '@/components/features/appointments/components/complete-appointment-dialog'
import { ReassignProfessionalDialog } from '@/components/features/appointments/components/reassign-professional-dialog'
import { VaccinationHistory } from '@/components/features/vaccinations/components/vaccination-history'
import { useVaccinations } from '@/components/features/vaccinations/hooks/use-vaccinations.hook'
import type { IApiError } from '@/types/api.types'

type TabId = 'resumo' | 'prontuario' | 'receitas' | 'atestados' | 'exames' | 'fotos' | 'vacinas'

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.user)
  const role = currentUser?.role ?? UserRole.USER

  // A própria ficha, se houver. Antes vinha de `doctors?.[0]`, que só acerta
  // para PROFESSIONAL — para um ADMIN aquela lista é a clínica inteira.
  const { data: myProfessional } = useMyProfessional()
  const currentDoctorId = myProfessional?.id

  const { data: appointment, isLoading, isError } = useAppointment(id)

  const { mutate: complete, isPending: isCompleting, error: completeError } = useCompleteAppointment()
  const { mutate: cancel, isPending: isCancelling } = useCancelAppointment()
  const { mutate: reassign, isPending: isReassigning, error: reassignError, reset: resetReassign } =
    useReassignAppointment()

  const [activeTab, setActiveTab] = useState<TabId>('resumo')
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [showSeriesDialog, setShowSeriesDialog] = useState(false)

  const canManage =
    role === UserRole.ADMIN ||
    (role === UserRole.PROFESSIONAL && appointment?.professionalId === currentDoctorId)

  // A series is assumed to have a single professional — the ownership check when
  // cancelling "this and all future" relies on it — so the backend rejects
  // reassigning one occurrence with 422. Offering the button would only produce
  // a guaranteed error.
  const canReassign =
    role === UserRole.ADMIN &&
    appointment?.status === AppointmentStatus.SCHEDULED &&
    !appointment?.seriesId

  const canSeeMedicalRecord =
    role === UserRole.ADMIN ||
    (role === UserRole.PROFESSIONAL && appointment?.professionalId === currentDoctorId)

  const canAct = canManage && appointment?.status === AppointmentStatus.SCHEDULED

  // Emitir receita/atestado/exame e enviar foto vem da ficha de profissional,
  // não do cargo — e só na própria consulta, porque o documento carrega o
  // registro de quem atendeu.
  const canIssue = !!currentDoctorId && appointment?.professionalId === currentDoctorId

  const { data: prescriptions } = usePrescriptions(id)
  const { data: atestados } = useAtestados(id)
  const { data: examRequests } = useExamRequests(id)
  const { data: photos } = useAppointmentPhotos(id)
  const { data: appointmentVaccinations } = useVaccinations({ appointmentId: id })
  const { data: vaccineIndications } = useVaccineIndications(id)
  const { data: record } = useMedicalRecordByAppointment(canSeeMedicalRecord ? id : '')

  const completeApiError = completeError as IApiError | null
  const completeErrorMessage =
    completeApiError?.status === 422
      ? 'Não é possível concluir uma consulta futura.'
      : completeApiError
        ? 'Ocorreu um erro ao concluir. Tente novamente.'
        : null

  function handleCompleteConfirm() {
    complete(id, {
      onSuccess: () => setShowCompleteDialog(false),
      onError: () => setShowCompleteDialog(false),
    })
  }

  function handleCancelConfirm({ cancellationReason, scope }: ICancelConfirmInput) {
    cancel(
      { id, data: { cancellationReason, scope } },
      {
        onSuccess: () => setShowCancelDialog(false),
      },
    )
  }

  const reassignApiError = reassignError as IApiError | null
  const reassignErrorMessage =
    reassignApiError?.status === 422
      ? 'Este profissional não está disponível para esta consulta. Escolha outro.'
      : reassignApiError?.status === 409
        ? 'O horário deste profissional acabou de ser preenchido. Escolha outro.'
        : reassignApiError
          ? 'Ocorreu um erro ao trocar o profissional. Tente novamente.'
          : null

  function handleOpenReassign() {
    resetReassign()
    setShowReassignDialog(true)
  }

  function handleReassignConfirm(professionalId: string) {
    reassign(
      { id, professionalId },
      {
        onSuccess: () => setShowReassignDialog(false),
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
    ...(canManage
      ? [{ id: 'fotos', label: 'Fotos', count: photos?.length ?? 0 }]
      : []),
    // A caderneta é do paciente, não da consulta: a contagem aqui é do que ESTE
    // atendimento lançou — doses registradas mais indicações emitidas —, e a aba
    // abre o histórico inteiro do paciente.
    ...(canSeeMedicalRecord
      ? [
          {
            id: 'vacinas',
            label: 'Vacinas',
            count: (appointmentVaccinations?.total ?? 0) + (vaccineIndications?.length ?? 0),
          },
        ]
      : []),
  ]

  return (
    <>
      <main className="p-4 sm:p-6 max-w-5xl pb-24 sm:pb-6" data-testid="appointment-detail-page">
        <div className="mb-4 hidden sm:block">
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
              canReassign={canReassign}
              hasRecord={!!record}
              onBack={() => router.back()}
              onFillRecord={() => setActiveTab('prontuario')}
              onCancel={() => setShowCancelDialog(true)}
              onComplete={() => setShowCompleteDialog(true)}
              onReassign={handleOpenReassign}
              onViewSeries={() => setShowSeriesDialog(true)}
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
                  patientId={appointment.patientId}
                  prescriptionCount={canManage ? (prescriptions?.length ?? 0) : undefined}
                  showPrescriptions={canManage}
                  certificateCount={canManage ? (atestados?.length ?? 0) : undefined}
                  showCertificates={canManage}
                  examCount={canManage ? (examRequests?.length ?? 0) : undefined}
                  showExames={canManage}
                  photoCount={canManage ? (photos?.length ?? 0) : undefined}
                  showPhotos={canManage}
                  onNavigate={(tab) => setActiveTab(tab as TabId)}
                />
              )}

              {activeTab === 'prontuario' && canSeeMedicalRecord && (
                <MedicalRecordSection
                  appointmentId={id}
                  specialtyId={appointment.specialtyId}
                  professionalId={appointment.professionalId}
                  appointmentStatus={appointment.status}
                  canManage={canManage}
                />
              )}

              {activeTab === 'receitas' && canManage && (
                <PrescriptionSection
                  appointmentId={id}
                  professionalId={appointment.professionalId}
                  canManage={canManage}
                  canIssue={canIssue}
                />
              )}

              {activeTab === 'atestados' && canManage && (
                <AtestadoSection
                  appointmentId={id}
                  professionalId={appointment.professionalId}
                  canManage={canManage}
                  canIssue={canIssue}
                />
              )}

              {activeTab === 'exames' && canManage && (
                <ExameSection
                  appointmentId={id}
                  professionalId={appointment.professionalId}
                  canManage={canManage}
                  canIssue={canIssue}
                />
              )}

              {activeTab === 'fotos' && canManage && (
                <PhotoSection appointmentId={id} canManage={canManage} canIssue={canIssue} />
              )}

              {activeTab === 'vacinas' && canSeeMedicalRecord && (
                <div className="flex flex-col gap-8">
                  <VaccineIndicationSection
                    appointmentId={id}
                    canManage={canManage}
                    canIssue={canIssue}
                  />
                  <VaccinationHistory patientId={appointment.patientId} appointmentId={id} />
                </div>
              )}
            </div>
          </>
        )}

        {/* Mobile sticky action bar */}
        {appointment && canAct && (
          <div className="fixed bottom-0 inset-x-0 flex gap-3 bg-surface border-t border-border p-4 sm:hidden">
            {canReassign && (
              <Button
                type="button"
                variant="ghost"
                disabled={isCancelling || isCompleting || isReassigning}
                onClick={handleOpenReassign}
                className="flex-1"
                data-testid="appointment-detail-reassign-button-mobile"
              >
                Trocar
              </Button>
            )}
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
              onClick={() => setShowCompleteDialog(true)}
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
          seriesId={appointment.seriesId}
          seriesFutureCount={appointment.seriesFutureCount}
        />
      )}

      {appointment?.seriesId && (
        <SeriesOccurrencesDialog
          seriesId={appointment.seriesId}
          isOpen={showSeriesDialog}
          onClose={() => setShowSeriesDialog(false)}
          currentAppointmentId={id}
        />
      )}

      {appointment && (
        <CompleteAppointmentDialog
          isOpen={showCompleteDialog}
          isPending={isCompleting}
          onClose={() => setShowCompleteDialog(false)}
          onConfirm={handleCompleteConfirm}
        />
      )}

      {appointment && canReassign && (
        <ReassignProfessionalDialog
          isOpen={showReassignDialog}
          appointmentId={id}
          isPending={isReassigning}
          errorMessage={reassignErrorMessage}
          onClose={() => setShowReassignDialog(false)}
          onConfirm={handleReassignConfirm}
        />
      )}
    </>
  )
}
