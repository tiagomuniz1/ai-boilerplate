import { clinicSpecialtiesService } from '../services/clinic-specialties.service'
import { toClinicSpecialtyModel } from '../mappers/to-clinic-specialty-model.mapper'
import type { IClinicSpecialtyModel } from '../types/clinic-specialty.types'

export async function linkSpecialtyUseCase(
  clinicId: string,
  specialtyId: string,
): Promise<IClinicSpecialtyModel> {
  const dto = await clinicSpecialtiesService.link(clinicId, specialtyId)
  return toClinicSpecialtyModel(dto)
}
