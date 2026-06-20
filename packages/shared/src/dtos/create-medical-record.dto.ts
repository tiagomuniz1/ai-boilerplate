import { IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

export class CreateMedicalRecordDto {
  @IsUUID()
  appointmentId!: string

  @IsObject()
  data!: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string
}
