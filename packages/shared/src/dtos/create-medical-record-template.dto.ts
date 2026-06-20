import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { MedicalRecordTemplateFieldDto } from './medical-record-template-field.dto'

export class CreateMedicalRecordTemplateDto {
  @IsUUID()
  specialtyId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicalRecordTemplateFieldDto)
  fields!: MedicalRecordTemplateFieldDto[]
}
