import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator'

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,6}\/[A-Z]{2}$/, { message: 'crmNumber must be in the format NNNNN/UF (e.g., 12345/SP)' })
  crmNumber?: string

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  specialtyIds?: string[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

}
