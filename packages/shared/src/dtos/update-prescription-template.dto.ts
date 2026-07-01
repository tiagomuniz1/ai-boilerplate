import { ArrayMinSize, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { CreatePrescriptionTemplateItemDto } from './create-prescription-template.dto'

export class UpdatePrescriptionTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionTemplateItemDto)
  @ArrayMinSize(1)
  items?: CreatePrescriptionTemplateItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsUUID()
  doctorId?: string
}
