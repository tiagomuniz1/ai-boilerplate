import { AppointmentResponseDto } from './appointment-response.dto'
import { AppointmentPatientDto } from './appointment-patient.dto'

export class AppointmentDetailResponseDto extends AppointmentResponseDto {
  patient: AppointmentPatientDto
}
