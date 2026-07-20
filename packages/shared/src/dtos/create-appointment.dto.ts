import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator'
import { AppointmentInsuranceType } from '../enums/appointment-insurance-type.enum'

export class CreateAppointmentDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @IsUUID()
  patientId: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string

  @IsOptional()
  @IsEnum(AppointmentInsuranceType)
  insuranceType?: AppointmentInsuranceType
}
