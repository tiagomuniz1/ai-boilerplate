import type { DashboardResponseDto } from '@app/shared'
import { toDashboardModel } from './to-dashboard-model'

const mockDto: DashboardResponseDto = {
  period: { from: '2026-01-01', to: '2026-01-31' },
  kpi: { scheduled: 10, confirmed: 5, completed: 8, noShow: 2 },
  patients: { total: 20, newPatients: 12, returningPatients: 8, byGender: { male: 9, female: 11 } },
  procedures: { total: 8, items: [{ label: 'Cardiologia', value: 8 }] },
  insurance: { total: 8, particular: 5, convenio: 3 },
  cidRanking: { total: 5, items: [{ label: 'M54.5', value: 5 }] },
  appointmentsByDay: [{ date: '2026-01-15', count: 3 }],
  ageDistribution: [{ age: 30, count: 5 }],
  todayBirthdays: [{ patientId: 'p1', fullName: 'Ana Costa', age: 32 }],
}

describe('toDashboardModel', () => {
  it('converts period strings to Dates', () => {
    const model = toDashboardModel(mockDto)
    expect(model.period.from).toBeInstanceOf(Date)
    expect(model.period.to).toBeInstanceOf(Date)
    expect(model.period.from.toISOString().startsWith('2026-01-01')).toBe(true)
    expect(model.period.to.toISOString().startsWith('2026-01-31')).toBe(true)
  })

  it('passes kpi through', () => {
    const { kpi } = toDashboardModel(mockDto)
    expect(kpi).toEqual(mockDto.kpi)
  })

  it('passes patients through', () => {
    const { patients } = toDashboardModel(mockDto)
    expect(patients).toEqual(mockDto.patients)
  })

  it('passes procedures through', () => {
    const { procedures } = toDashboardModel(mockDto)
    expect(procedures).toEqual(mockDto.procedures)
  })

  it('passes insurance through', () => {
    const { insurance } = toDashboardModel(mockDto)
    expect(insurance).toEqual(mockDto.insurance)
  })

  it('passes cidRanking through', () => {
    const { cidRanking } = toDashboardModel(mockDto)
    expect(cidRanking).toEqual(mockDto.cidRanking)
  })

  it('converts appointmentsByDay date strings to Dates', () => {
    const model = toDashboardModel(mockDto)
    expect(model.appointmentsByDay[0].date).toBeInstanceOf(Date)
    expect(model.appointmentsByDay[0].count).toBe(3)
  })

  // The timeline chart labels each point with the date's local calendar day.
  // `new Date('YYYY-MM-DD')` parses as UTC midnight, which is the previous
  // evening in a UTC-behind timezone — every point would be labelled a day early.
  it('anchors appointmentsByDay dates at local midnight, not UTC', () => {
    const { date } = toDashboardModel(mockDto).appointmentsByDay[0]
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(15)
    expect(date.getHours()).toBe(0)
  })

  it('passes ageDistribution through', () => {
    const { ageDistribution } = toDashboardModel(mockDto)
    expect(ageDistribution).toEqual(mockDto.ageDistribution)
  })

  it('passes todayBirthdays through', () => {
    const { todayBirthdays } = toDashboardModel(mockDto)
    expect(todayBirthdays).toEqual(mockDto.todayBirthdays)
  })

  it('handles empty appointmentsByDay', () => {
    const model = toDashboardModel({ ...mockDto, appointmentsByDay: [] })
    expect(model.appointmentsByDay).toHaveLength(0)
  })
})
