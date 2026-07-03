export interface IDashboardModel {
  period: { from: Date; to: Date }
  kpi: { scheduled: number; confirmed: number; completed: number; noShow: number }
  patients: {
    total: number
    newPatients: number
    returningPatients: number
    byGender: { male: number; female: number }
  }
  procedures: { total: number; items: { label: string; value: number }[] }
  insurance: { total: number; particular: number; convenio: number }
  cidRanking: { total: number; items: { label: string; value: number }[] }
  appointmentsByDay: { date: Date; count: number }[]
  ageDistribution: { age: number; count: number }[]
  todayBirthdays: { patientId: string; fullName: string; age: number }[]
}

export interface IDashboardFilters {
  from?: string
  to?: string
  doctorId?: string
}
