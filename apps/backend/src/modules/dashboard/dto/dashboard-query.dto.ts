import { IsISO8601, IsOptional, IsUUID, Matches } from 'class-validator'

export class DashboardQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be a date in YYYY-MM-DD format' })
  from?: string

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be a date in YYYY-MM-DD format' })
  to?: string

  @IsOptional()
  @IsUUID()
  professionalId?: string
}
