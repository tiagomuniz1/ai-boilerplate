import type { RegisterClinicResponseDto } from '@app/shared'
import { clinicsService } from '../services/clinics.service'
import type { IRegisterClinicInput } from '../types/clinic.types'

export async function registerClinicUseCase(
  input: Omit<IRegisterClinicInput, 'adminPasswordConfirm'>,
): Promise<RegisterClinicResponseDto> {
  return clinicsService.register(input)
}
