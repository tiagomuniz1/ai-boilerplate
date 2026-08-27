import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

interface RecurrenceTerminatorCarrier {
  occurrenceCount?: number
  untilDate?: string
}

/**
 * A recurring series must end somewhere: the caller supplies an occurrence count,
 * an until date, or both (whichever is reached first wins). Mirrors the
 * CK_appointment_series_has_terminator check constraint in the database.
 */
@ValidatorConstraint({ name: 'hasRecurrenceTerminator', async: false })
export class HasRecurrenceTerminatorConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as RecurrenceTerminatorCarrier
    return dto.occurrenceCount !== undefined || dto.untilDate !== undefined
  }

  defaultMessage(): string {
    return 'Either occurrenceCount or untilDate must be provided'
  }
}

export function HasRecurrenceTerminator(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasRecurrenceTerminatorConstraint,
    })
  }
}
