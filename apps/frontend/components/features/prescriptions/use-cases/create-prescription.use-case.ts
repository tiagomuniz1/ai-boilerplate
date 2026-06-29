import { prescriptionsService } from '../services/prescriptions.service'
import { toCreatePrescriptionDto } from '../mappers/to-create-prescription-dto.mapper'
import { toPrescriptionModel } from '../mappers/to-prescription-model.mapper'
import type { ICreatePrescriptionInput } from '../types/prescription-input.types'
import type { IPrescriptionModel } from '../types/prescription-model.types'

export async function createPrescriptionUseCase(input: ICreatePrescriptionInput): Promise<IPrescriptionModel> {
  const dto = await prescriptionsService.create(toCreatePrescriptionDto(input))
  return toPrescriptionModel(dto)
}
