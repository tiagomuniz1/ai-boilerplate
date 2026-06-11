import { Type } from 'class-transformer'
import { IsOptional, ValidateNested } from 'class-validator'
import { AddressDto, UpdateClinicDto } from '@app/shared'

export class UpdateClinicRequestDto extends UpdateClinicDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  declare address?: AddressDto
}
