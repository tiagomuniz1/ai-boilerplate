import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
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

export class UpdateCanonicalFieldDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'canonicalKey must be a snake_case slug (e.g., blood_pressure)',
  })
  canonicalKey?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string

  @IsOptional()
  @IsEnum(MedicalRecordFieldType)
  type?: MedicalRecordFieldType

  @IsOptional()
  @IsArray()
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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
