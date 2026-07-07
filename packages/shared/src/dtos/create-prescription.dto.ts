import { ArrayMinSize, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreatePrescriptionItemDto {
  @IsOptional()
  @IsUUID()
  medicationId?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  activeIngredientName?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dosage?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  quantity?: string

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  instructions: string
}

export class CreatePrescriptionDto {
  @IsUUID()
  appointmentId: string

  // Optional: which of the doctor's CRMs to sign with. Defaults to the primary CRM.
  @IsOptional()
  @IsUUID()
  crmId?: string

  // Optional: which of the doctor's registered specialties to sign as (carries RQE and title).
  // Defaults to the appointment's specialty.
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  @ArrayMinSize(1)
  items: CreatePrescriptionItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
