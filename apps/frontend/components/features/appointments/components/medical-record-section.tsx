'use client'

import { useState } from 'react'
import { AppointmentStatus, getPrimaryCouncilType } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { useTemplates } from '@/components/features/medical-record-templates/hooks/use-templates.hook'
import { useCreateMedicalRecord } from '@/components/features/medical-records/hooks/use-create-medical-record.hook'
import { useUpdateMedicalRecord } from '@/components/features/medical-records/hooks/use-update-medical-record.hook'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { MedicalRecordForm } from '@/components/features/medical-records/components/medical-record-form'
import { MedicalRecordView } from '@/components/features/medical-records/components/medical-record-view'
import { MedicalRecordFormSkeleton } from '@/components/features/medical-records/components/medical-record-form-skeleton'
import type { IRecordFieldModel } from '@/components/features/medical-records/types/medical-record-model.types'
import type { ITemplateFieldModel } from '@/components/features/medical-record-templates/types/template-model.types'
import type { ITemplateListParams } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import type { IApiError } from '@/types/api.types'

type MedicalRecordMode = 'fill' | null

export interface MedicalRecordSectionProps {
  appointmentId: string
  specialtyId: string | null
  professionalId: string
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
    sectionKey: f.sectionKey,
  }
}

export function MedicalRecordSection({
  appointmentId,
  specialtyId,
  professionalId,
  appointmentStatus,
  canManage,
}: MedicalRecordSectionProps) {
  const [mode, setMode] = useState<MedicalRecordMode>(null)

  const { data: record, isLoading: isRecordLoading } = useMedicalRecordByAppointment(appointmentId)

  const needsProfessionalLookup = !specialtyId
  const { data: professional, isLoading: isProfessionalLoading } = useProfessional(professionalId, {
    enabled: needsProfessionalLookup,
  })
  const councilType = professional ? getPrimaryCouncilType(professional.registrations) : undefined

  const templateParams: ITemplateListParams | null = specialtyId
    ? { specialtyId, limit: 1 }
    : councilType
      ? { councilType, limit: 1 }
      : null

  const { data: templateData, isLoading: isTemplateLoading } = useTemplates(templateParams)
  const isResolvingTemplate = needsProfessionalLookup ? isProfessionalLoading || isTemplateLoading : isTemplateLoading

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
  const sections = template?.sections.slice().sort((a, b) => a.order - b.order) ?? []

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
      {!record && (
        <div className="rounded-xl border border-border bg-surface p-12 flex flex-col items-center gap-4 text-center">
          <div className="text-4xl" aria-hidden="true">📋</div>
          <h3 className="text-lg font-semibold text-text">Prontuário ainda não preenchido</h3>
          <p className="text-sm text-text-mute max-w-sm">
            Registre evolução, hipótese diagnóstica e conduta da consulta.
          </p>
          {canManage && (
            <Button
              type="button"
              onClick={() => setMode('fill')}
              data-testid="fill-medical-record-button"
            >
              Preencher prontuário
            </Button>
          )}
        </div>
      )}

      {record && (
        <>
          {canEdit && (
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                onClick={() => setMode('fill')}
                data-testid="edit-medical-record-button"
              >
                Editar prontuário
              </Button>
            </div>
          )}
          <MedicalRecordView record={record} sections={sections} />
        </>
      )}

      <Modal
        isOpen={mode === 'fill'}
        onClose={() => setMode(null)}
        title={record ? 'Editar prontuário' : 'Preencher prontuário'}
        className="max-w-2xl"
        data-testid="medical-record-form-modal"
      >
        {isResolvingTemplate && <MedicalRecordFormSkeleton />}
        {!isResolvingTemplate && schema.length === 0 && (
          <Alert variant="error" data-testid="no-template-alert">
            Nenhum template de prontuário encontrado para esta especialidade.
          </Alert>
        )}
        {!isResolvingTemplate && schema.length > 0 && (
          <MedicalRecordForm
            schema={schema}
            sections={sections}
            defaultData={record?.data}
            defaultNotes={record?.notes ?? undefined}
            isPending={isCreating || isUpdating}
            globalError={formGlobalError}
            onSubmit={record ? handleUpdateSubmit : handleCreateSubmit}
          />
        )}
      </Modal>

    </>
  )
}
