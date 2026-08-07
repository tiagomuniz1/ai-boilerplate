import { Type } from 'class-transformer'
import { IsDefined, IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator'
import { SubscriptionPlan } from '../enums/subscription-plan.enum'
import { AddressDto } from './address.dto'

export class CreateClinicDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must be kebab-case (e.g., clinica-do-coracao)' })
  slug?: string

  // Defaults to SubscriptionPlan.FREE in the use-case when omitted.
  @IsOptional()
  @IsEnum(SubscriptionPlan)
  plan?: SubscriptionPlan

  @IsOptional()
  @IsUUID()
  themeId?: string | null

  @IsDefined()
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto
}
