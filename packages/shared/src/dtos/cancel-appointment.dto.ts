import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { AppointmentCancellationScope } from '../enums/appointment-cancellation-scope.enum'

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string

  @IsOptional()
  @IsEnum(AppointmentCancellationScope)
  scope?: AppointmentCancellationScope
}
