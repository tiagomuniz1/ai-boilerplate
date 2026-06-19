import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator'

export class CreateScheduleExceptionDto {
  @IsOptional()
  @IsUUID()
  doctorId?: string

  @IsDateString()
  date: string

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string | null

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null
}
