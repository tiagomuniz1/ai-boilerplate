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
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { useTemplates } from '@/components/features/medical-record-templates/hooks/use-templates.hook'
import { useCreateMedicalRecord } from '@/components/features/medical-records/hooks/use-create-medical-record.hook'
import { useUpdateMedicalRecord } from '@/components/features/medical-records/hooks/use-update-medical-record.hook'
import { MedicalRecordForm } from '@/components/features/medical-records/components/medical-record-form'
import { MedicalRecordView } from '@/components/features/medical-records/components/medical-record-view'
import { MedicalRecordFormSkeleton } from '@/components/features/medical-records/components/medical-record-form-skeleton'
import type { IRecordFieldModel } from '@/components/features/medical-records/types/medical-record-model.types'
import type { ITemplateFieldModel } from '@/components/features/medical-record-templates/types/template-model.types'

const statusBadgeClass: Record<AppointmentStatus, string> = {
  [AppointmentStatus.SCHEDULED]: 'bg-accent/10 text-accent',
  [AppointmentStatus.CANCELLED]: 'bg-danger/10 text-danger',
  [AppointmentStatus.COMPLETED]: 'bg-good/10 text-good',
}

type MedicalRecordMode = 'fill' | 'view' | null

interface AppointmentDetailsDialogProps {
  appointmentId: string | null
  isOpen: boolean
  onClose: () => void
  role: UserRole
  currentDoctorId?: string
}

function templateFieldToRecordField(f: ITemplateFieldModel, index: number): IRecordFieldModel {
  return {
    key: f.key ?? `field_${index}`,
    label: f.label,
    type: f.type,
    required: f.required,
    order: f.order,
    options: f.options,
    placeholder: f.placeholder,
    helpText: f.helpText,
  }
}

interface MedicalRecordSectionProps {
  appointmentId: string
  specialtyId: string | null
  appointmentStatus: AppointmentStatus
  canManage: boolean
}

function MedicalRecordSection({
  appointmentId,
  specialtyId,
  appointmentStatus,
  canManage,
}: MedicalRecordSectionProps) {
  const [mode, setMode] = useState<MedicalRecordMode>(null)

  const { data: record, isLoading: isRecordLoading } = useMedicalRecordByAppointment(appointmentId)
  const { data: templateData, isLoading: isTemplateLoading } = useTemplates(
    specialtyId ? { specialtyId, limit: 1 } : undefined,
  )
  const { mutate: createRecord, isPending: isCreating, error: createError } = useCreateMedicalRecord()
  const { mutate: updateRecord, isPending: isUpdating, error: updateError } = useUpdateMedicalRecord()

  if (isRecordLoading) return null

  const template = templateData?.data[0]
  const schema: IRecordFieldModel[] = record
    ? record.schema
    : template
      ? template.fields
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(templateFieldToRecordField)
      : []

  const isCompleted = appointmentStatus === AppointmentStatus.COMPLETED
  const canEdit = canManage && !isCompleted && !!record

  function handleCreateSubmit(data: Record<string, unknown>, notes?: string) {
    createRecord(
      { appointmentId, data, notes },
      {
        onSuccess: () => setMode(null),
      },
    )
  }

  function handleUpdateSubmit(data: Record<string, unknown>, notes?: string) {
    /* c8 ignore next */
    if (!record) return
    updateRecord(
      { id: record.id, data: { data, notes } },
      {
        onSuccess: () => setMode(null),
      },
    )
  }

  const createApiError = createError as IApiError | null
  const updateApiError = updateError as IApiError | null
  const formGlobalError = createApiError?.status === 409
    ? 'Esta consulta já possui prontuário.'
    : createApiError?.status === 422 || updateApiError?.status === 422
      ? 'Prontuário não pode ser editado após a conclusão da consulta.'
      : createApiError || updateApiError
        ? 'Ocorreu um erro ao salvar o prontuário.'
        : null

  return (
    <>
      <div className="flex gap-2 pt-1">
        {canManage && !record && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMode('fill')}
            data-testid="fill-medical-record-button"
            className="text-sm"
          >
            Preencher prontuário
          </Button>
        )}
        {record && (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMode('view')}
              data-testid="view-medical-record-button"
              className="text-sm"
            >
              Ver prontuário
            </Button>
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('fill')}
                data-testid="edit-medical-record-button"
                className="text-sm"
              >
                Editar prontuário
              </Button>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={mode === 'fill'}
        onClose={() => setMode(null)}
        title={record ? 'Editar prontuário' : 'Preencher prontuário'}
        data-testid="medical-record-form-modal"
      >
        {isTemplateLoading && <MedicalRecordFormSkeleton />}
        {!isTemplateLoading && schema.length === 0 && (
          <Alert variant="error" data-testid="no-template-alert">
            Nenhum template de prontuário encontrado para esta especialidade.
          </Alert>
        )}
        {!isTemplateLoading && schema.length > 0 && (
          <MedicalRecordForm
            schema={schema}
            defaultData={record?.data}
            defaultNotes={record?.notes ?? undefined}
            isPending={isCreating || isUpdating}
            globalError={formGlobalError}
            onSubmit={record ? handleUpdateSubmit : handleCreateSubmit}
          />
        )}
      </Modal>

      <Modal
        isOpen={mode === 'view'}
        onClose={() => setMode(null)}
        title="Prontuário"
        data-testid="medical-record-view-modal"
      >
        {record && <MedicalRecordView record={record} />}
      </Modal>
    </>
  )
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

  const canSeeMedicalRecord =
    role === UserRole.ADMIN ||
    (role === UserRole.DOCTOR && appointment?.doctorId === currentDoctorId)

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

            {canSeeMedicalRecord && appointmentId && (
              <MedicalRecordSection
                appointmentId={appointmentId}
                specialtyId={appointment.specialtyId}
                appointmentStatus={appointment.status}
                canManage={canManage}
              />
            )}

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
