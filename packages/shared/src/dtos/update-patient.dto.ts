import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'
import { KinshipType } from '../enums/kinship-type.enum'
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
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, { message: 'phoneNumber must be in format (XX) XXXXX-XXXX' })
  phoneNumber?: string

  @IsOptional()
  @IsDateString()
  @IsPastOrPresentDate({ message: 'birthDate cannot be in the future' })
  birthDate?: string

  @IsOptional()
  @IsEnum(PatientGender)
  gender?: PatientGender

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'documentNumber must be exactly 11 digits' })
  documentNumber?: string

  @IsOptional()
  @IsUUID()
  responsiblePatientId?: string | null

  @IsOptional()
  @IsEnum(KinshipType)
  kinshipType?: KinshipType | null
}
