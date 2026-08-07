import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { SubscriptionPlan } from '../enums/subscription-plan.enum'
import { AddressDto } from './address.dto'

export class UpdateClinicDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., clinica-do-coracao)' })
  slug?: string

  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsUUID()
  themeId?: string | null

  @IsOptional()
  @ValidateNested()
  address?: AddressDto
}
