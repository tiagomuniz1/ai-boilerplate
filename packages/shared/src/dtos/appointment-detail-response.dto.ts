import { AppointmentResponseDto } from './appointment-response.dto'
import { AppointmentPatientDto } from './appointment-patient.dto'

export class AppointmentDetailResponseDto extends AppointmentResponseDto {
  patient: AppointmentPatientDto
  /**
   * Still-cancellable occurrences of the same series dated after this one.
   * Null when the appointment is not part of a series. Drives the "this and all
   * future" cancellation copy — seriesTotalOccurrences minus seriesSequence
   * would be wrong, as it ignores already cancelled/completed occurrences.
   */
  seriesFutureCount: number | null
}
