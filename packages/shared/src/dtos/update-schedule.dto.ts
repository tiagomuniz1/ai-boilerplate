import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator'
import { DayOfWeek } from '../enums/day-of-week.enum'

export class UpdateScheduleDto {
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(120)
  slotDurationInMinutes?: number

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validFrom?: string | null

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validUntil?: string | null
}
