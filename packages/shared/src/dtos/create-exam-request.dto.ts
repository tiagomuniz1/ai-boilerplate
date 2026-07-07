import { ArrayMinSize, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateExamRequestItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observations?: string
}

export class CreateExamRequestDto {
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
  @Type(() => CreateExamRequestItemDto)
  @ArrayMinSize(1)
  items: CreateExamRequestItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
