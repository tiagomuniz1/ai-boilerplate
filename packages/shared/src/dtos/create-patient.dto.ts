import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { PatientGender } from '../enums/patient-gender.enum'

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
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  fullName!: string

  @IsString()
  @Matches(/^\d{11}$/, { message: 'documentNumber must be exactly 11 digits' })
  documentNumber!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phoneNumber!: string

  @IsDateString()
  @IsPastOrPresentDate({ message: 'birthDate cannot be in the future' })
  birthDate!: string

  @IsEnum(PatientGender)
  gender!: PatientGender
}
