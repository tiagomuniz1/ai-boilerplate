import type { MedicalRecordResponseDto, MedicalRecordTemplateFieldDto, PaginatedMedicalRecordsResponseDto } from '@app/shared'
import type { IMedicalRecordModel, IRecordFieldModel, IPaginatedMedicalRecordsModel } from '../types/medical-record-model.types'

function toRecordFieldModel(field: MedicalRecordTemplateFieldDto): IRecordFieldModel {
  return {
    key: field.key!,
    label: field.label,
    type: field.type,
    required: field.required,
    order: field.order,
    options: field.options ? field.options.map((o) => ({ value: o.value, label: o.label })) : null,
    placeholder: field.placeholder ?? null,
    helpText: field.helpText ?? null,
  }
}

export function toMedicalRecordModel(dto: MedicalRecordResponseDto): IMedicalRecordModel {
  return {
    id: dto.id,
    appointmentId: dto.appointmentId,
    patientId: dto.patientId,
    patientName: dto.patientName,
    doctorId: dto.doctorId,
    doctorName: dto.doctorName,
    specialtyId: dto.specialtyId,
    specialtyName: dto.specialtyName,
    schema: dto.templateSchemaSnapshot
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((f) => toRecordFieldModel(f)),
    data: dto.data,
    notes: dto.notes,
    createdAt: new Date(dto.createdAt as unknown as string),
    updatedAt: new Date(dto.updatedAt as unknown as string),
  }
}

export function toPaginatedMedicalRecordsModel(
  dto: PaginatedMedicalRecordsResponseDto,
): IPaginatedMedicalRecordsModel {
  return {
    data: dto.data.map((d) => toMedicalRecordModel(d)),
    total: dto.total,
    page: dto.page,
    limit: dto.limit,
  }
}
