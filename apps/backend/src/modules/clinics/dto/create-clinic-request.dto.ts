import { Type } from 'class-transformer'
import { ValidateNested } from 'class-validator'
import { AddressDto, CreateClinicDto } from '@app/shared'

export class CreateClinicRequestDto extends CreateClinicDto {
  @ValidateNested()
  @Type(() => AddressDto)
  declare address: AddressDto
}
