import { IsOptional, IsUUID, Matches } from 'class-validator'

export class AvailabilityQueryDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string
}
