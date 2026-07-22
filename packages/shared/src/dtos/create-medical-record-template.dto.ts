import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { CouncilType } from '../enums/council-type.enum'
import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'
import { MedicalRecordTemplateSectionDto } from './medical-record-template-section.dto'

export class CreateMedicalRecordTemplateDto {
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  // Only meaningful when specialtyId is absent — scopes a generalist template to a profession.
  // ADMIN may set it explicitly; PROFESSIONAL requests always have it derived server-side from
  // the caller's own registration, regardless of what's sent here.
  @IsOptional()
  @IsEnum(CouncilType)
  councilType?: CouncilType

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordTemplateFieldDto)
  fields!: MedicalRecordTemplateFieldDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordTemplateSectionDto)
  sections?: MedicalRecordTemplateSectionDto[]
}
