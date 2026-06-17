import { clinicSpecialtiesService } from '../services/clinic-specialties.service'

export async function unlinkSpecialtyUseCase(
  clinicId: string,
  specialtyId: string,
): Promise<void> {
  return clinicSpecialtiesService.unlink(clinicId, specialtyId)
}
