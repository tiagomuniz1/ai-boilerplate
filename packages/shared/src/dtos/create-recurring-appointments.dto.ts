import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { AppointmentInsuranceType } from '../enums/appointment-insurance-type.enum'
import { RecurrenceInterval } from '../enums/recurrence-interval.enum'
import {
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
} from '../config/recurrence.config'
import { HasRecurrenceTerminator } from './recurrence-terminator.validator'

/**
 * The client submits the explicit list of dates it confirmed on the preview
 * screen — exactly what the user saw and ticked. The recurrence rule travels
 * along only to be persisted on the series and to let the server re-validate
 * that every submitted date really sits on the requested grid.
 */
export class CreateRecurringAppointmentsDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @IsUUID()
  patientId: string

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime: string

  @HasRecurrenceTerminator()
  @IsEnum(RecurrenceInterval)
  recurrenceInterval: RecurrenceInterval

  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(MINIMUM_RECURRING_OCCURRENCES)
  @ArrayMaxSize(MAXIMUM_RECURRING_OCCURRENCES)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true, message: 'each date must be in YYYY-MM-DD format' })
  dates: string[]

  @IsOptional()
  @IsInt()
  @Min(MINIMUM_RECURRING_OCCURRENCES)
  @Max(MAXIMUM_RECURRING_OCCURRENCES)
  occurrenceCount?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'untilDate must be in YYYY-MM-DD format' })
  untilDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string

  @IsOptional()
  @IsEnum(AppointmentInsuranceType)
  insuranceType?: AppointmentInsuranceType
}
