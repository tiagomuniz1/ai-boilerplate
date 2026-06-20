import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator'

export class UpdateMedicalRecordDto {
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string
}
