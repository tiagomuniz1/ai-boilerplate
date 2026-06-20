import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { MedicalRecordFieldType } from '../enums/medical-record-field-type.enum'
import { MedicalRecordFieldOptionDto } from './medical-record-field-option.dto'

export class CreateCanonicalFieldDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'canonicalKey must be a snake_case slug (e.g., blood_pressure)',
  })
  canonicalKey!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string

  @IsEnum(MedicalRecordFieldType)
  type!: MedicalRecordFieldType

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordFieldOptionDto)
  options?: MedicalRecordFieldOptionDto[]

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string

  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}
