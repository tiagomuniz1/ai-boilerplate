import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'

export class MedicalRecordResponseDto {
  id!: string
  appointmentId!: string
  patientId!: string
  patientName!: string
  doctorId!: string
  doctorName!: string
  specialtyId!: string
  specialtyName!: string
  templateId!: string
  templateSchemaSnapshot!: MedicalRecordTemplateFieldDto[]
  data!: Record<string, unknown>
  notes!: string | null
  createdAt!: Date
  updatedAt!: Date
}
