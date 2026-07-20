export class AvailableSlotDto {
  startTime: string
  endTime: string
  scheduleId: string
  slotDurationInMinutes: number
}

export class AvailabilityResponseDto {
  professionalId: string
  date: string
  slots: AvailableSlotDto[]
}
