import { IsEnum, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { RecurrenceInterval } from '../enums/recurrence-interval.enum'
import {
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
} from '../config/recurrence.config'
import { HasRecurrenceTerminator } from './recurrence-terminator.validator'

export class PreviewRecurringAppointmentsDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @IsUUID()
  patientId: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime: string

  @HasRecurrenceTerminator()
  @IsEnum(RecurrenceInterval)
  recurrenceInterval: RecurrenceInterval

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MINIMUM_RECURRING_OCCURRENCES)
  @Max(MAXIMUM_RECURRING_OCCURRENCES)
  occurrenceCount?: number

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'untilDate must be in YYYY-MM-DD format' })
  untilDate?: string
}
