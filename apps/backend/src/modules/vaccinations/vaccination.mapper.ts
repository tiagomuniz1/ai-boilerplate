import { VaccinationResponseDto } from '@app/shared'
import { Vaccination } from './entities/vaccination.entity'

export function toVaccinationResponse(vaccination: Vaccination): VaccinationResponseDto {
  return {
    id: vaccination.id,
    patientId: vaccination.patientId,
    vaccineId: vaccination.vaccineId,
    vaccineName: vaccination.vaccine.name,
    vaccineAbbreviation: vaccination.vaccine.abbreviation,
    appointmentId: vaccination.appointmentId,
    recordedByProfessionalId: vaccination.recordedByProfessionalId,
    recordedByProfessionalName: vaccination.recordedByProfessional.user.fullName,
    doseLabel: vaccination.doseLabel,
    appliedAt: vaccination.appliedAt,
    appliedAtOurClinic: vaccination.appliedAtOurClinic,
    appliedAtDescription: vaccination.appliedAtDescription,
    lotNumber: vaccination.lotNumber,
    manufacturer: vaccination.manufacturer,
    notes: vaccination.notes,
    createdAt: vaccination.createdAt,
  }
}
