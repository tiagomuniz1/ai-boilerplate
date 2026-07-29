import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentInsuranceType, AppointmentStatus, CouncilType, DayOfWeek, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { CacheService } from '../../../cache/cache.service'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Professional } from '../../professionals/entities/professional.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000099'
const OTHER_CLINIC_ID = '20000000-0000-4000-8000-000000000099'

process.env.NODE_ENV = 'test'
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost'
process.env.DB_PORT = process.env.DB_PORT ?? '5499'
process.env.DB_USER = process.env.DB_USER ?? 'postgres'
process.env.DB_PASS = process.env.DB_PASS ?? 'postgres'
process.env.DB_NAME = process.env.DB_NAME ?? 'app'
process.env.DB_SCHEMA = 'test'
process.env.REDIS_HOST = process.env.REDIS_HOST ?? 'localhost'
process.env.REDIS_PORT = process.env.REDIS_PORT ?? '6399'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('DashboardController (integration)', () => {
  let app: INestApplication
  let cacheService: CacheService
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Professional>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let professionalId: string
  let otherDoctorId: string
  let patientId: string
  let scheduleId: string
  let otherScheduleId: string
  let specialtyId: string
  let birthdayPatientId: string

  const today = new Date().toISOString().split('T')[0]

  function daysAgo(n: number): string {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().split('T')[0]
  }

  function todayBirthDate(): string {
    const d = new Date()
    const year = d.getUTCFullYear() - 30
    return `${year}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
  }

  const allDays = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ]

  function dayOfWeekFor(dateStr: string): DayOfWeek {
    return allDays[new Date(dateStr + 'T12:00:00Z').getUTCDay()]
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    cacheService = module.get(CacheService)
    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    doctorRepository = module.get(getRepositoryToken(Professional))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
  })

  beforeEach(async () => {
    try {
      await cacheService.delByPattern('dashboard:*')
    } catch {
      // Ignore cache errors in test setup
    }

    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.professional_specialties')
    await doctorRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    // Main clinic
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Dashboard Clinic', slug: 'dash-clinic', isActive: true }),
    )
    // Other clinic for isolation tests
    await clinicRepository.save(
      clinicRepository.create({ id: OTHER_CLINIC_ID, name: 'Other Clinic', slug: 'other-clinic', isActive: true }),
    )

    const password = 'Password123!'
    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@dashboard.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor One',
        email: 'doctor@dashboard.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Two',
        email: 'other-doctor@dashboard.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@dashboard.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Cardiologia' }))
    specialtyId = specialty.id

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '10001', state: 'SP', isPrimary: true }] as any
    doctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const doctorProfile = await doctorRepository.save(doctorEntity)
    professionalId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '10002', state: 'SP', isPrimary: true }] as any
    otherDoctorEntity.professionalSpecialties = ([]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    // Regular patient
    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Patient',
        email: 'patient@dashboard.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    const patientRecord = await patientRepository.save(
      patientRepository.create({
        userId: patientUser.id,
        clinicId: SEED_CLINIC_ID,
        documentNumber: faker.string.numeric(11),
        phoneNumber: faker.string.numeric(11),
        birthDate: '1990-06-01',
        gender: PatientGender.MALE,
      }),
    )
    patientId = patientRecord.id

    // Birthday patient — born today (month/day), 30 years ago
    const birthdayUser = await userRepository.save(
      userRepository.create({
        fullName: 'Birthday Patient',
        email: 'birthday@dashboard.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    const birthdayPatient = await patientRepository.save(
      patientRepository.create({
        userId: birthdayUser.id,
        clinicId: SEED_CLINIC_ID,
        documentNumber: faker.string.numeric(11),
        phoneNumber: faker.string.numeric(11),
        birthDate: todayBirthDate(),
        gender: PatientGender.FEMALE,
      }),
    )
    birthdayPatientId = birthdayPatient.id

    // Schedule covering all days
    const pastDate = daysAgo(5)
    const scheduleRecord = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: dayOfWeekFor(pastDate),
        startTime: '08:00',
        endTime: '10:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )
    scheduleId = scheduleRecord.id

    const otherScheduleRecord = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId: otherDoctorId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: dayOfWeekFor(daysAgo(3)),
        startTime: '08:00',
        endTime: '10:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )
    otherScheduleId = otherScheduleRecord.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: 'dash-clinic' })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token_dash-clinic='))
      return match ? match.slice('access_token_dash-clinic='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@dashboard.test')
    doctorToken = await loginAndExtractToken('doctor@dashboard.test')
    otherDoctorToken = await loginAndExtractToken('other-doctor@dashboard.test')
    userToken = await loginAndExtractToken('user@dashboard.test')
  })

  afterAll(async () => {
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.professional_specialties')
    await doctorRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  async function seedAppointment(overrides: Partial<{
    professionalId: string
    patientId: string
    scheduleId: string
    date: string
    startTime: string
    endTime: string
    status: AppointmentStatus
    insuranceType: AppointmentInsuranceType | null
    specialtyId: string | null
    clinicId: string
  }> = {}) {
    return appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId,
        patientId,
        scheduleId,
        date: daysAgo(5),
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.COMPLETED,
        insuranceType: null,
        specialtyId: null,
        reason: null,
        cancellationReason: null,
        ...overrides,
      }),
    )
  }

  it('returns 401 when unauthenticated', async () => {
    await request(app.getHttpServer()).get('/dashboard').expect(401)
  })

  it('returns 200 with correct DTO shape for ADMIN', async () => {
    await seedAppointment({ status: AppointmentStatus.COMPLETED })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .expect(200)

    expect(body).toHaveProperty('period')
    expect(body).toHaveProperty('kpi')
    expect(body).toHaveProperty('patients')
    expect(body).toHaveProperty('procedures')
    expect(body).toHaveProperty('insurance')
    expect(body).toHaveProperty('cidRanking')
    expect(body).toHaveProperty('appointmentsByDay')
    expect(body).toHaveProperty('ageDistribution')
    expect(body).toHaveProperty('todayBirthdays')
    expect(body.kpi).toHaveProperty('scheduled')
    expect(body.kpi).toHaveProperty('confirmed')
    expect(body.kpi).toHaveProperty('completed')
    expect(body.kpi).toHaveProperty('noShow')
  })

  it('returns 200 for USER role (read access)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${userToken}`)
      .expect(200)

    expect(body).toHaveProperty('kpi')
  })

  it('KPIs reflect actual appointment status counts', async () => {
    const pastDate = daysAgo(5)
    await seedAppointment({ status: AppointmentStatus.COMPLETED, date: pastDate })
    await seedAppointment({ status: AppointmentStatus.COMPLETED, date: pastDate, startTime: '08:30', endTime: '09:00' })
    await seedAppointment({ status: AppointmentStatus.NO_SHOW, date: pastDate, startTime: '09:00', endTime: '09:30' })
    await seedAppointment({ status: AppointmentStatus.CONFIRMED, date: pastDate, startTime: '09:30', endTime: '10:00' })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: pastDate, to: today })
      .expect(200)

    expect(body.kpi.completed).toBe(2)
    expect(body.kpi.noShow).toBe(1)
    expect(body.kpi.confirmed).toBe(1)
  })

  it('completing an appointment invalidates the cached dashboard stats (regression: dashboard used to show stale data)', async () => {
    const pastDate = daysAgo(5)
    const scheduled = await seedAppointment({ status: AppointmentStatus.SCHEDULED, date: pastDate })

    const { body: before } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: pastDate, to: today })
      .expect(200)

    expect(before.kpi.completed).toBe(0)
    expect(before.kpi.scheduled).toBe(1)

    await request(app.getHttpServer())
      .patch(`/appointments/${scheduled.id}/complete`)
      .set('Cookie', `access_token=${adminToken}`)
      .expect(200)

    // Same cache key (same from/to/clinic/professional filter) — this only reflects
    // the completion if CompleteAppointmentUseCase actually invalidated `dashboard:*`.
    const { body: after } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: pastDate, to: today })
      .expect(200)

    expect(after.kpi.completed).toBe(1)
    expect(after.kpi.scheduled).toBe(0)
  })

  it('procedures grouped by specialty; null specialty → "Sem especialidade"', async () => {
    const pastDate = daysAgo(5)
    await seedAppointment({ status: AppointmentStatus.COMPLETED, specialtyId, date: pastDate })
    await seedAppointment({ status: AppointmentStatus.COMPLETED, specialtyId: null, date: pastDate, startTime: '08:30', endTime: '09:00' })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: pastDate, to: today })
      .expect(200)

    const labels = body.procedures.items.map((i: any) => i.label)
    expect(labels).toContain('Cardiologia')
    expect(labels).toContain('Sem especialidade')
    expect(body.procedures.total).toBe(2)
  })

  it('insurance stats sum particular and convenio and ignore null', async () => {
    const pastDate = daysAgo(5)
    await seedAppointment({ status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, date: pastDate })
    await seedAppointment({ status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, date: pastDate, startTime: '08:30', endTime: '09:00' })
    await seedAppointment({ status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.CONVENIO, date: pastDate, startTime: '09:00', endTime: '09:30' })
    await seedAppointment({ status: AppointmentStatus.COMPLETED, insuranceType: null, date: pastDate, startTime: '09:30', endTime: '10:00' })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: pastDate, to: today })
      .expect(200)

    expect(body.insurance.particular).toBe(2)
    expect(body.insurance.convenio).toBe(1)
    expect(body.insurance.total).toBe(3)
  })

  it('appointmentsByDay covers all days in range including zeros', async () => {
    const from = daysAgo(6)
    const to = daysAgo(2)
    await seedAppointment({ status: AppointmentStatus.COMPLETED, date: daysAgo(4) })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from, to })
      .expect(200)

    const days = body.appointmentsByDay
    const fromDate = new Date(from + 'T00:00:00Z')
    const toDate = new Date(to + 'T00:00:00Z')
    const expectedDays = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1

    expect(days).toHaveLength(expectedDays)
    expect(days[0].date).toBe(from)
    expect(days[days.length - 1].date).toBe(to)
    const hasZero = days.some((d: any) => d.count === 0)
    const hasNonZero = days.some((d: any) => d.count > 0)
    expect(hasZero).toBe(true)
    expect(hasNonZero).toBe(true)
  })

  it('todayBirthdays returns patient with today month/day birthdate', async () => {
    // Seed an appointment for the birthday patient so they are visible via clinic link
    await seedAppointment({ patientId: birthdayPatientId, status: AppointmentStatus.COMPLETED })

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .expect(200)

    const birthday = body.todayBirthdays.find((b: any) => b.patientId === birthdayPatientId)
    expect(birthday).toBeDefined()
    expect(birthday.fullName).toBe('Birthday Patient')
    expect(birthday.age).toBe(30)
  })

  it('DOCTOR only sees own appointment data', async () => {
    const pastDate = daysAgo(5)

    // Doctor 1: 3 completed
    for (let i = 0; i < 3; i++) {
      await seedAppointment({
        professionalId,
        scheduleId,
        status: AppointmentStatus.COMPLETED,
        date: pastDate,
        startTime: `0${8 + i}:00`,
        endTime: `0${8 + i}:30`,
      })
    }

    // Doctor 2: 1 completed
    await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId: otherDoctorId,
        patientId,
        scheduleId: otherScheduleId,
        date: daysAgo(3),
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.COMPLETED,
        insuranceType: null,
        specialtyId: null,
        reason: null,
        cancellationReason: null,
      }),
    )

    const { body: doctorBody } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${doctorToken}`)
      .query({ from: daysAgo(10), to: today })
      .expect(200)

    const { body: adminBody } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: daysAgo(10), to: today })
      .expect(200)

    expect(doctorBody.kpi.completed).toBe(3)
    expect(adminBody.kpi.completed).toBe(4)
  })

  it('ADMIN with professionalId filter only returns that doctor data', async () => {
    const pastDate = daysAgo(5)

    await seedAppointment({ professionalId, scheduleId, status: AppointmentStatus.COMPLETED, date: pastDate })
    await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId: otherDoctorId,
        patientId,
        scheduleId: otherScheduleId,
        date: daysAgo(3),
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.COMPLETED,
        insuranceType: null,
        specialtyId: null,
        reason: null,
        cancellationReason: null,
      }),
    )

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: daysAgo(10), to: today, professionalId })
      .expect(200)

    expect(body.kpi.completed).toBe(1)
  })

  it('data from another clinic does not appear in dashboard', async () => {
    // Insert appointment for another clinic directly
    const otherSchedule = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId,
        clinicId: OTHER_CLINIC_ID,
        dayOfWeek: dayOfWeekFor(daysAgo(5)),
        startTime: '08:00',
        endTime: '10:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )

    await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: OTHER_CLINIC_ID,
        professionalId,
        patientId,
        scheduleId: otherSchedule.id,
        date: daysAgo(5),
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.COMPLETED,
        insuranceType: null,
        specialtyId: null,
        reason: null,
        cancellationReason: null,
      }),
    )

    const { body } = await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .expect(200)

    expect(body.kpi.completed).toBe(0)
  })

  it('returns 400 when from has invalid format', async () => {
    await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: '22-06-2026' })
      .expect(400)
  })

  it('returns 422 when from is after to', async () => {
    await request(app.getHttpServer())
      .get('/dashboard')
      .set('Cookie', `access_token=${adminToken}`)
      .query({ from: '2026-06-22', to: '2026-06-01' })
      .expect(422)
  })
})
