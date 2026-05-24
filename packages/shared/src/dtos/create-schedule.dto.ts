import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Matches, Max, Min } from 'class-validator'
import { DayOfWeek } from '../enums/day-of-week.enum'

export class CreateScheduleDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string

  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime: string

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime: string

  @IsInt()
  @Min(15)
  @Max(120)
  slotDurationInMinutes: number

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validFrom?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  validUntil?: string
}
