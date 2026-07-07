import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'

export class DoctorCrmInputDto {
  @IsString()
  @Matches(/^\d{1,6}$/, { message: 'CRM number must contain only digits (e.g., 12345)' })
  number!: string

  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'CRM state must be a two-letter UF (e.g., SP)' })
  state!: string

  @IsBoolean()
  isPrimary!: boolean
}

export class DoctorSpecialtyInputDto {
  @IsUUID('4')
  specialtyId!: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/, { message: 'RQE must contain only digits' })
  @MaxLength(10)
  rqe?: string
}

export class CreateDoctorDto {
  @IsOptional()
  @IsUUID()
  userId?: string

  @ValidateIf(o => !o.userId)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName?: string

  @ValidateIf(o => !o.userId)
  @IsEmail()
  email?: string

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DoctorCrmInputDto)
  crms!: DoctorCrmInputDto[]

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DoctorSpecialtyInputDto)
  specialties!: DoctorSpecialtyInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string
}
