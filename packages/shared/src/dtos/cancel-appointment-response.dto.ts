import { AppointmentResponseDto } from './appointment-response.dto'

export class CancelAppointmentResponseDto extends AppointmentResponseDto {
  cancelledOccurrenceCount: number
  cancelledAppointmentIds: string[]
}
