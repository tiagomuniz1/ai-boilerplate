import { doctorsService } from '../services/doctors.service'

export async function deleteDoctorUseCase(id: string): Promise<void> {
  return doctorsService.remove(id)
}
