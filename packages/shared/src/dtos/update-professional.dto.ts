import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { ProfessionalRegistrationInputDto, ProfessionalSpecialtyInputDto } from './create-professional.dto'

export class UpdateProfessionalDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProfessionalRegistrationInputDto)
  registrations?: ProfessionalRegistrationInputDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalSpecialtyInputDto)
  specialties?: ProfessionalSpecialtyInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
