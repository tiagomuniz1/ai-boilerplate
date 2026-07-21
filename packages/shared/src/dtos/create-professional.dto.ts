import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
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
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { CouncilType } from '../enums/council-type.enum'
import { COUNCIL_REGISTRATION_FORMATS } from '../config/council-registration-format.config'

@ValidatorConstraint({ name: 'isValidRegistrationNumber', async: false })
export class IsValidRegistrationNumberConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const councilType = (args.object as Record<string, unknown>).councilType as CouncilType | undefined
    if (!councilType || !(councilType in COUNCIL_REGISTRATION_FORMATS)) return false
    return COUNCIL_REGISTRATION_FORMATS[councilType].numberPattern.test(value)
  }
  defaultMessage(args: ValidationArguments): string {
    const councilType = (args.object as Record<string, unknown>).councilType as CouncilType | undefined
    const format = councilType ? COUNCIL_REGISTRATION_FORMATS[councilType] : undefined
    return format
      ? `number must match the ${format.label} format (e.g., ${format.numberPlaceholder})`
      : 'number does not match the format expected for councilType'
  }
}

export function IsValidRegistrationNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRegistrationNumberConstraint,
    })
  }
}

export class ProfessionalRegistrationInputDto {
  @IsEnum(CouncilType)
  councilType!: CouncilType

  @IsString()
  @MaxLength(20)
  @IsValidRegistrationNumber({ message: 'number must match the format expected for the selected councilType' })
  number!: string

  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a two-letter UF (e.g., SP)' })
  state!: string

  @IsBoolean()
  isPrimary!: boolean
}

export class ProfessionalSpecialtyInputDto {
  @IsUUID('4')
  specialtyId!: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,10}$/, { message: 'registryNumber must contain only digits' })
  @MaxLength(10)
  registryNumber?: string
}

export class CreateProfessionalDto {
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
  @Type(() => ProfessionalRegistrationInputDto)
  registrations!: ProfessionalRegistrationInputDto[]

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfessionalSpecialtyInputDto)
  specialties!: ProfessionalSpecialtyInputDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string
}
