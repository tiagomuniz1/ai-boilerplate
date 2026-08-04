import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidateIf,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'
import { KinshipType } from '../enums/kinship-type.enum'

@ValidatorConstraint({ name: 'isPastOrPresentDate', async: false })
export class IsPastOrPresentDateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true
    const date = new Date(value)
    return !isNaN(date.getTime()) && date <= new Date()
  }
  defaultMessage(): string {
    return '$property cannot be in the future'
  }
}

export function IsPastOrPresentDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastOrPresentDateConstraint,
    })
  }
}

export class CreatePatientDto {
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

  @ValidateIf(o => !o.responsiblePatientId)
  @IsString()
  @Matches(/^\d{11}$/, { message: 'documentNumber must be exactly 11 digits' })
  documentNumber?: string

  @IsString()
  @Matches(/^\(\d{2}\) \d{4,5}-\d{4}$/, { message: 'phoneNumber must be in format (XX) XXXXX-XXXX' })
  phoneNumber!: string

  @IsDateString()
  @IsPastOrPresentDate({ message: 'birthDate cannot be in the future' })
  birthDate!: string

  @IsEnum(PatientGender)
  gender!: PatientGender

  @IsOptional()
  @IsUUID()
  responsiblePatientId?: string

  @ValidateIf(o => !!o.responsiblePatientId)
  @IsEnum(KinshipType)
  kinshipType?: KinshipType
}
