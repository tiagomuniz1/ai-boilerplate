import { ArrayMinSize, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class CreatePrescriptionTemplateItemDto {
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

export class CreatePrescriptionTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string

  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionTemplateItemDto)
  @ArrayMinSize(1)
  items: CreatePrescriptionTemplateItemDto[]

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string

  @IsOptional()
  @IsUUID()
  doctorId?: string
}
