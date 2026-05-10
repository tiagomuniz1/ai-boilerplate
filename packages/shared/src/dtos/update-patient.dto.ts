import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'
import { IsPastOrPresentDate } from './create-patient.dto'

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phoneNumber?: string

  @IsOptional()
  @IsDateString()
  @IsPastOrPresentDate({ message: 'birthDate cannot be in the future' })
  birthDate?: string

  @IsOptional()
  @IsEnum(PatientGender)
  gender?: PatientGender
}
