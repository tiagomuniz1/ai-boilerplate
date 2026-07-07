import { Type } from 'class-transformer'
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { DoctorCrmInputDto, DoctorSpecialtyInputDto } from './create-doctor.dto'

export class UpdateDoctorDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DoctorCrmInputDto)
  crms?: DoctorCrmInputDto[]

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DoctorSpecialtyInputDto)
  specialties?: DoctorSpecialtyInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
