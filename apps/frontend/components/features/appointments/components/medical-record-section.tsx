'use client'

import { useState } from 'react'
import { AppointmentStatus } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { useTemplates } from '@/components/features/medical-record-templates/hooks/use-templates.hook'
import { useCreateMedicalRecord } from '@/components/features/medical-records/hooks/use-create-medical-record.hook'
import { useUpdateMedicalRecord } from '@/components/features/medical-records/hooks/use-update-medical-record.hook'
import { MedicalRecordForm } from '@/components/features/medical-records/components/medical-record-form'
import { MedicalRecordView } from '@/components/features/medical-records/components/medical-record-view'
import { MedicalRecordFormSkeleton } from '@/components/features/medical-records/components/medical-record-form-skeleton'
import type { IRecordFieldModel } from '@/components/features/medical-records/types/medical-record-model.types'
import type { ITemplateFieldModel } from '@/components/features/medical-record-templates/types/template-model.types'
import type { IApiError } from '@/types/api.types'

type MedicalRecordMode = 'fill' | 'view' | null

export interface MedicalRecordSectionProps {
  appointmentId: string
  specialtyId: string | null
  appointmentStatus: AppointmentStatus
  canManage: boolean
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

export function MedicalRecordSection({
  appointmentId,
  specialtyId,
  appointmentStatus,
  canManage,
}: MedicalRecordSectionProps) {
  const [mode, setMode] = useState<MedicalRecordMode>(null)

  const { data: record, isLoading: isRecordLoading } = useMedicalRecordByAppointment(appointmentId)
  const { data: templateData, isLoading: isTemplateLoading } = useTemplates(
    specialtyId ? { specialtyId, limit: 1 } : null,
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
  const formGlobalError =
    createApiError?.status === 409
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
