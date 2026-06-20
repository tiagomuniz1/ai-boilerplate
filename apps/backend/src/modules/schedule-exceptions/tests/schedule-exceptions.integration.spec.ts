import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, DayOfWeek, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { ScheduleException } from '../entities/schedule-exception.entity'

const SEED_CLINIC_ID = '20000000-0000-4000-8000-000000000000'

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

describe('ScheduleExceptionsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let scheduleExceptionRepository: Repository<ScheduleException>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let otherDoctorId: string
  let patientId: string
  let scheduleId: string

  // Future Friday for schedule tests
  const futureDate = (() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7) + 7)
    return d.toISOString().split('T')[0]
  })()

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

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    doctorRepository = module.get(getRepositoryToken(Doctor))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
    scheduleExceptionRepository = module.get(getRepositoryToken(ScheduleException))
  })

  beforeEach(async () => {
    await scheduleExceptionRepository.query('DELETE FROM test.schedule_exceptions')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Exception Clinic',
        slug: 'exception-clinic',
        isActive: true,
      }),
    )

    const password = 'Password123!'
    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@exceptions.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor User',
        email: 'doctor@exceptions.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'otherdoctor@exceptions.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@exceptions.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Geral' }))

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      crmNumber: '11111/SP',
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.specialties = [specialty]
    const doctorProfile = await doctorRepository.save(doctorEntity)
    doctorId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      crmNumber: '22222/SP',
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.specialties = [specialty]
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Patient',
        email: 'patient@exceptions.test',
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
        birthDate: '1990-01-01',
        gender: PatientGender.MALE,
      }),
    )
    patientId = patientRecord.id

    const scheduleRecord = await scheduleRepository.save(
      scheduleRepository.create({
        doctorId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )
    scheduleId = scheduleRecord.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: 'exception-clinic' })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token_exception-clinic='))
      return match ? match.slice('access_token_exception-clinic='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@exceptions.test')
    doctorToken = await loginAndExtractToken('doctor@exceptions.test')
    otherDoctorToken = await loginAndExtractToken('otherdoctor@exceptions.test')
    userToken = await loginAndExtractToken('user@exceptions.test')
  })

  afterAll(async () => {
    await scheduleExceptionRepository.query('DELETE FROM test.schedule_exceptions')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  // --- POST /schedule-exceptions ---

  describe('POST /schedule-exceptions', () => {
    it('DOCTOR creates all-day exception for self without doctorId', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate })
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.doctorId).toBe(doctorId)
      expect(body.startTime).toBeNull()
      expect(body.endTime).toBeNull()
    })

    it('DOCTOR creates partial block (14:00-18:00)', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate, startTime: '14:00', endTime: '18:00' })
        .expect(201)

      expect(body.startTime).toBe('14:00')
      expect(body.endTime).toBe('18:00')
    })

    it('DOCTOR sending doctorId of another doctor → uses own id (ignores dto.doctorId)', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate, doctorId: otherDoctorId })
        .expect(201)

      expect(body.doctorId).toBe(doctorId)
    })

    it('ADMIN creates exception for another doctor', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ date: futureDate, doctorId: otherDoctorId })
        .expect(201)

      expect(body.doctorId).toBe(otherDoctorId)
    })

    it('ADMIN without doctorId → 422', async () => {
      await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ date: futureDate })
        .expect(422)
    })

    it('startTime >= endTime → 422', async () => {
      await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate, startTime: '18:00', endTime: '14:00' })
        .expect(422)
    })

    it('USER cannot create exception → 403', async () => {
      await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${userToken}`)
        .send({ date: futureDate, doctorId })
        .expect(403)
    })

    it('rejects block when appointment is scheduled in window → 409 with conflicting times', async () => {
      await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          patientId,
          scheduleId,
          date: futureDate,
          startTime: '09:00',
          endTime: '09:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate, startTime: '08:00', endTime: '12:00' })
        .expect(409)

      expect(body.detail).toContain('09:00')
      const exceptionCount = await scheduleExceptionRepository.count()
      expect(exceptionCount).toBe(0)
    })

    it('allows block on date with only cancelled appointments', async () => {
      await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          patientId,
          scheduleId,
          date: futureDate,
          startTime: '09:00',
          endTime: '09:30',
          status: AppointmentStatus.CANCELLED,
          reason: null,
          cancellationReason: 'test',
        }),
      )

      await request(app.getHttpServer())
        .post('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ date: futureDate })
        .expect(201)
    })
  })

  // --- GET /schedule-exceptions ---

  describe('GET /schedule-exceptions', () => {
    it('ADMIN lists all exceptions', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      const { body } = await request(app.getHttpServer())
        .get('/schedule-exceptions')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.total).toBeGreaterThanOrEqual(1)
    })

    it('DOCTOR lists only own exceptions', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId: otherDoctorId, date: futureDate }),
      )

      const { body } = await request(app.getHttpServer())
        .get('/schedule-exceptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.data.every((e: any) => e.doctorId === doctorId)).toBe(true)
    })

    it('filters by from/to range', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: '2099-01-10' }),
      )
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: '2099-03-10' }),
      )

      const { body } = await request(app.getHttpServer())
        .get('/schedule-exceptions?from=2099-01-01&to=2099-02-01')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data.every((e: any) => e.date <= '2099-02-01')).toBe(true)
    })

    it('USER cannot list exceptions → 403', async () => {
      await request(app.getHttpServer())
        .get('/schedule-exceptions')
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  // --- GET /schedule-exceptions/:id ---

  describe('GET /schedule-exceptions/:id', () => {
    it('returns exception by id for ADMIN', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(exc.id)
    })

    it('DOCTOR cannot view exception of another doctor → 403', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId: otherDoctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .get(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(403)
    })

    it('non-existent id → 404', async () => {
      await request(app.getHttpServer())
        .get(`/schedule-exceptions/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })
  })

  // --- PATCH /schedule-exceptions/:id ---

  describe('PATCH /schedule-exceptions/:id', () => {
    it('ADMIN updates exception', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ reason: 'Medical conference' })
        .expect(200)

      expect(body.reason).toBe('Medical conference')
    })

    it('DOCTOR updates own exception', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ reason: 'Personal' })
        .expect(200)

      expect(body.reason).toBe('Personal')
    })

    it('DOCTOR cannot update exception of another doctor → 403', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId: otherDoctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .patch(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ reason: 'Hacked' })
        .expect(403)
    })

    it('rejects update when appointment in new window → 409', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: futureDate,
          startTime: '11:00',
          endTime: '12:00',
        }),
      )
      await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          patientId,
          scheduleId,
          date: futureDate,
          startTime: '09:00',
          endTime: '09:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      await request(app.getHttpServer())
        .patch(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ startTime: '08:00', endTime: '12:00' })
        .expect(409)
    })

    it('removes reason when sent as null', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate, reason: 'Old reason' }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ reason: null })
        .expect(200)

      expect(body.reason).toBeNull()
    })
  })

  // --- DELETE /schedule-exceptions/:id ---

  describe('DELETE /schedule-exceptions/:id', () => {
    it('ADMIN deletes any exception → 204', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .delete(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const deleted = await scheduleExceptionRepository.findOne({ where: { id: exc.id } })
      expect(deleted).toBeNull()
    })

    it('DOCTOR deletes own exception → 204', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .delete(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)
    })

    it('DOCTOR cannot delete exception of another doctor → 403', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId: otherDoctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .delete(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(403)
    })

    it('non-existent id → 404', async () => {
      await request(app.getHttpServer())
        .delete(`/schedule-exceptions/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('USER cannot delete → 403', async () => {
      const exc = await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({ clinicId: SEED_CLINIC_ID, doctorId, date: futureDate }),
      )

      await request(app.getHttpServer())
        .delete(`/schedule-exceptions/${exc.id}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  // --- Availability integration ---

  describe('GET /appointments/availability (exception filtering)', () => {
    it('slot overlapping an exception is removed from availability', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: futureDate,
          startTime: '09:00',
          endTime: '10:00',
        }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/availability?doctorId=${doctorId}&date=${futureDate}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      const slotTimes = body.slots.map((s: any) => s.startTime)
      expect(slotTimes).not.toContain('09:00')
      expect(slotTimes).not.toContain('09:30')
      expect(slotTimes).toContain('08:00')
      expect(slotTimes).toContain('08:30')
    })

    it('slot outside exception window remains available', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: futureDate,
          startTime: '10:00',
          endTime: '12:00',
        }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/availability?doctorId=${doctorId}&date=${futureDate}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      const slotTimes = body.slots.map((s: any) => s.startTime)
      expect(slotTimes).toContain('08:00')
      expect(slotTimes).toContain('08:30')
      expect(slotTimes).toContain('09:00')
      expect(slotTimes).toContain('09:30')
      expect(slotTimes).not.toContain('10:00')
    })

    it('all-day exception removes all slots', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: futureDate,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/availability?doctorId=${doctorId}&date=${futureDate}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.slots).toHaveLength(0)
    })

    it('slot touching exception border remains available (slotEnd == blockStart)', async () => {
      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: futureDate,
          startTime: '09:00',
          endTime: '12:00',
        }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/availability?doctorId=${doctorId}&date=${futureDate}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      const slotTimes = body.slots.map((s: any) => s.startTime)
      expect(slotTimes).toContain('08:00')
      expect(slotTimes).toContain('08:30')
      expect(slotTimes).not.toContain('09:00')
    })

    it('exception in different date does not affect availability', async () => {
      const differentDate = new Date(futureDate)
      differentDate.setDate(differentDate.getDate() + 7)
      const nextWeekDate = differentDate.toISOString().split('T')[0]

      await scheduleExceptionRepository.save(
        scheduleExceptionRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          date: nextWeekDate,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/availability?doctorId=${doctorId}&date=${futureDate}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.slots.length).toBeGreaterThan(0)
    })
  })
})
