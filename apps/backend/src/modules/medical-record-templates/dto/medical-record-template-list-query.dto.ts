import { IsOptional, IsUUID } from 'class-validator'
import { PaginationDto } from '../../../common/dto/pagination.dto'

export class MedicalRecordTemplateListQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  specialtyId?: string
}
