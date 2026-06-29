import { ArrayMinSize, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreatePrescriptionItemDto {
  @IsUUID()
  medicationId: string

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  instructions: string
}

export class CreatePrescriptionDto {
  @IsUUID()
  appointmentId: string

  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  @ArrayMinSize(1)
  items: CreatePrescriptionItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string
}
