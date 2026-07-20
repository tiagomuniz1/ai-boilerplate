import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, CouncilType, DayOfWeek, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Professional } from '../../professionals/entities/professional.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../entities/appointment.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

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

describe('AppointmentsController (integration)', () => {
  let app: INestApplication
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
  let specialtyId: string
  let otherSpecialtyId: string

  // Friday 2 weeks from now, to ensure we always have a future FRIDAY available
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
    doctorRepository = module.get(getRepositoryToken(Professional))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
  })

  beforeEach(async () => {
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

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Appointment Clinic',
        slug: 'seed-clinic',
        isActive: true,
      }),
    )

    const password = 'Password123!'
    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@appointments.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor User',
        email: 'doctor@appointments.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@appointments.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@appointments.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Clínica Geral' }))
    specialtyId = specialty.id
    const otherSpecialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Dermatologia' }),
    )
    otherSpecialtyId = otherSpecialty.id

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }] as any
    doctorEntity.professionalSpecialties = [{ specialtyId: specialty.id, registryNumber: null }] as any
    const doctorProfile = await doctorRepository.save(doctorEntity)
    professionalId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true }] as any
    otherDoctorEntity.professionalSpecialties = [{ specialtyId: specialty.id, registryNumber: null }] as any
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Patient',
        email: 'patient-user@appointments.test',
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
        professionalId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.FRIDAY,
        startTime: '08:00',
        endTime: '10:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )
    scheduleId = scheduleRecord.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: 'seed-clinic' })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token_seed-clinic='))
      return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@appointments.test')
    doctorToken = await loginAndExtractToken('doctor@appointments.test')
    otherDoctorToken = await loginAndExtractToken('other@appointments.test')
    userToken = await loginAndExtractToken('user@appointments.test')
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

  describe('GET /appointments/availability', () => {
    it('returns 200 with available slots for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/appointments/availability')
        .set('Cookie', `access_token=${adminToken}`)
        .query({ professionalId, date: futureDate })
        .expect(200)

      expect(body.professionalId).toBe(professionalId)
      expect(body.date).toBe(futureDate)
      expect(Array.isArray(body.slots)).toBe(true)
      expect(body.slots.length).toBeGreaterThan(0)
      expect(body.slots[0]).toHaveProperty('startTime')
      expect(body.slots[0]).toHaveProperty('endTime')
      expect(body.slots[0]).toHaveProperty('scheduleId')
    })

    it('returns 200 for DOCTOR (uses own profile)', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/appointments/availability')
        .set('Cookie', `access_token=${doctorToken}`)
        .query({ date: futureDate })
        .expect(200)

      expect(body.professionalId).toBe(professionalId)
    })

    it('returns 422 when ADMIN omits professionalId', async () => {
      await request(app.getHttpServer())
        .get('/appointments/availability')
        .set('Cookie', `access_token=${adminToken}`)
        .query({ date: futureDate })
        .expect(422)
    })

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .get('/appointments/availability')
        .query({ professionalId, date: futureDate })
        .expect(401)
    })
  })

  describe('POST /appointments', () => {
    it('returns 201 when DOCTOR creates own appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.professionalId).toBe(professionalId)
      expect(body.patientId).toBe(patientId)
      expect(body.date).toBe(futureDate)
      expect(body.startTime).toBe('08:00')
      expect(body.endTime).toBe('08:30')
      expect(body.scheduleId).toBe(scheduleId)
      expect(body.status).toBe(AppointmentStatus.SCHEDULED)
      expect(body.specialtyId).toBe(specialtyId)
      expect(body.specialtyName).toBe('Clínica Geral')
    })

    it('auto-resolves the only specialty and returns it in the response', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ professionalId, patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.specialtyId).toBe(specialtyId)
      expect(body.specialtyName).toBe('Clínica Geral')
    })

    it('books a generalist appointment (null specialty) when the doctor has no specialty', async () => {
      await doctorRepository.query('DELETE FROM test.professional_specialties WHERE professional_id = $1', [
        professionalId,
      ])

      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.specialtyName).toBeNull()
    })

    it('accepts an explicit specialtyId that belongs to the doctor', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ professionalId, patientId, specialtyId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.specialtyId).toBe(specialtyId)
    })

    it('returns 422 when specialtyId does not belong to the doctor', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ professionalId, patientId, specialtyId: otherSpecialtyId, date: futureDate, startTime: '08:00' })
        .expect(422)
    })

    it('returns 422 when the doctor has multiple specialties and specialtyId is omitted', async () => {
      const extra = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Cardiologia' }),
      )
      const doctor = await doctorRepository.findOne({
        where: { id: professionalId },
        relations: ['professionalSpecialties'],
      })
      doctor!.professionalSpecialties = [...doctor!.professionalSpecialties, { specialtyId: extra.id, registryNumber: null } as any]
      await doctorRepository.save(doctor!)

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ professionalId, patientId, date: futureDate, startTime: '08:00' })
        .expect(422)
    })

    it('returns 201 when ADMIN creates appointment with professionalId', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ professionalId, patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.professionalId).toBe(professionalId)
    })

    it('returns 409 when same slot is booked twice', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(409)
    })

    it('returns 422 when ADMIN omits professionalId', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(422)
    })

    it('returns 422 when booking in the past', async () => {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: yesterday.toISOString().split('T')[0], startTime: '08:00' })
        .expect(422)
    })

    it('returns 422 when slot is outside schedule', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '15:00' })
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${userToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(403)
    })

    it('returns 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId })
        .expect(400)
    })

    it('blocks deleting a specialty that has appointments attached', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      // Remove the doctor links so the appointment is the only blocker.
      await doctorRepository.query('DELETE FROM test.professional_specialties WHERE specialty_id = $1', [
        specialtyId,
      ])

      const hashed = await bcrypt.hash('Password123!', 1)
      await userRepository.save(
        userRepository.create({
          fullName: 'Platform Admin',
          email: 'platform@appointments.test',
          password: hashed,
          role: UserRole.PLATFORM_ADMIN,
          clinicId: null,
        }),
      )
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'platform@appointments.test', password: 'Password123!' })
      const rawCookies = loginRes.headers['set-cookie']
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token='))
      const platformAdminToken = match ? match.slice('access_token='.length).split(';')[0] : ''

      const { body } = await request(app.getHttpServer())
        .delete(`/specialties/${specialtyId}`)
        .set('Cookie', `access_token=${platformAdminToken}`)
        .expect(409)

      expect(body.detail).toContain('appointment')
    })
  })

  describe('GET /appointments', () => {
    it('returns 200 with list for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('page')
      expect(body).toHaveProperty('limit')
    })

    it('DOCTOR sees only own appointments', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.data.every((a: any) => a.professionalId === professionalId)).toBe(true)
    })

    it('returns 200 for USER role (read-only)', async () => {
      await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', `access_token=${userToken}`)
        .expect(200)
    })

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/appointments').expect(401)
    })
  })

  describe('GET /appointments/:id', () => {
    it('returns 200 for ADMIN viewing any appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/${created.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
    })

    it('returns patient block with all fields in the detail response', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/${created.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.patient).toBeDefined()
      expect(body.patient.fullName).toBe('Test Patient')
      expect(body.patient.email).toBe('patient-user@appointments.test')
      expect(body.patient.phoneNumber).toBeDefined()
      expect(body.patient.birthDate).toBe('1990-01-01')
      expect(body.patient.documentNumber).toBeDefined()
      expect(body.patient.gender).toBe(PatientGender.MALE)
    })

    it('GET /appointments list does not return patient block', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data[0]).not.toHaveProperty('patient')
    })

    it('DOCTOR can view detail of own appointment including patient block', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.patient).toBeDefined()
      expect(body.patient.fullName).toBe('Test Patient')
    })

    it('returns 403 when DOCTOR views another doctor appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .get(`/appointments/${created.id}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('USER can view detail with patient block (read-only)', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/appointments/${created.id}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(200)

      expect(body.patient).toBeDefined()
      expect(body.patient.fullName).toBe('Test Patient')
    })

    it('returns 404 for non-existent appointment', async () => {
      await request(app.getHttpServer())
        .get(`/appointments/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })
  })

  describe('PATCH /appointments/:id/cancel', () => {
    it('returns 200 when ADMIN cancels appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ cancellationReason: 'Patient requested' })
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.CANCELLED)
      expect(body.cancellationReason).toBe('Patient requested')
    })

    it('returns 200 when DOCTOR cancels own appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({})
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.CANCELLED)
    })

    it('returns 403 when DOCTOR cancels another doctor appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({})
        .expect(403)
    })

    it('returns 422 when cancelling an already cancelled appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({})
        .expect(200)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({})
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/cancel`)
        .set('Cookie', `access_token=${userToken}`)
        .send({})
        .expect(403)
    })
  })

  describe('PATCH /appointments/:id/complete', () => {
    it('returns 422 when completing a future appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/complete`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(422)
    })

    it('returns 200 when completing a past appointment', async () => {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]

      const pastSchedule = await scheduleRepository.save(
        scheduleRepository.create({
          professionalId,
          clinicId: SEED_CLINIC_ID,
          dayOfWeek: [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY][yesterday.getUTCDay()],
          startTime: '08:00',
          endTime: '10:00',
          slotDurationInMinutes: 30,
          validFrom: null,
          validUntil: null,
        }),
      )

      const appointment = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          scheduleId: pastSchedule.id,
          date: pastDate,
          startTime: '08:00',
          endTime: '08:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}/complete`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.COMPLETED)
    })

    it('returns 403 for USER role', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/complete`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 200 when completing a CONFIRMED past appointment', async () => {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]

      const pastSchedule = await scheduleRepository.save(
        scheduleRepository.create({
          professionalId,
          clinicId: SEED_CLINIC_ID,
          dayOfWeek: [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY][yesterday.getUTCDay()],
          startTime: '08:00',
          endTime: '10:00',
          slotDurationInMinutes: 30,
          validFrom: null,
          validUntil: null,
        }),
      )

      const appointment = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          scheduleId: pastSchedule.id,
          date: pastDate,
          startTime: '08:00',
          endTime: '08:30',
          status: AppointmentStatus.CONFIRMED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}/complete`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.COMPLETED)
    })
  })

  describe('PATCH /appointments/:id/confirm', () => {
    it('returns 200 when ADMIN confirms a scheduled appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.CONFIRMED)
      expect(body.insuranceType).toBeNull()
    })

    it('returns 200 when DOCTOR confirms own appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.CONFIRMED)
    })

    it('returns 403 when DOCTOR confirms another doctor appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 422 when confirming an already confirmed appointment', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('PATCH /appointments/:id/no-show', () => {
    it('returns 200 when ADMIN marks a past SCHEDULED appointment as no-show', async () => {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]

      const pastSchedule = await scheduleRepository.save(
        scheduleRepository.create({
          professionalId,
          clinicId: SEED_CLINIC_ID,
          dayOfWeek: [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY][yesterday.getUTCDay()],
          startTime: '08:00',
          endTime: '10:00',
          slotDurationInMinutes: 30,
          validFrom: null,
          validUntil: null,
        }),
      )

      const appointment = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          scheduleId: pastSchedule.id,
          date: pastDate,
          startTime: '08:00',
          endTime: '08:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.NO_SHOW)
    })

    it('returns 200 when marking a past CONFIRMED appointment as no-show', async () => {
      const yesterday = new Date()
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)
      const pastDate = yesterday.toISOString().split('T')[0]

      const pastSchedule = await scheduleRepository.save(
        scheduleRepository.create({
          professionalId,
          clinicId: SEED_CLINIC_ID,
          dayOfWeek: [DayOfWeek.SUNDAY, DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY][yesterday.getUTCDay()],
          startTime: '08:00',
          endTime: '10:00',
          slotDurationInMinutes: 30,
          validFrom: null,
          validUntil: null,
        }),
      )

      const appointment = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          professionalId,
          patientId,
          scheduleId: pastSchedule.id,
          date: pastDate,
          startTime: '08:00',
          endTime: '08:30',
          status: AppointmentStatus.CONFIRMED,
          reason: null,
          cancellationReason: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.status).toBe(AppointmentStatus.NO_SHOW)
    })

    it('returns 422 when marking a future appointment as no-show', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/no-show`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/no-show`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('POST /appointments with insuranceType', () => {
    it('persists insuranceType=particular and returns it in the response', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00', insuranceType: 'particular' })
        .expect(201)

      expect(body.insuranceType).toBe('particular')
    })

    it('persists insuranceType=convenio and returns it in the response', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00', insuranceType: 'convenio' })
        .expect(201)

      expect(body.insuranceType).toBe('convenio')

      const { body: fetched } = await request(app.getHttpServer())
        .get(`/appointments/${body.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(fetched.insuranceType).toBe('convenio')
    })

    it('returns null when insuranceType is omitted', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      expect(body.insuranceType).toBeNull()
    })

    it('returns 400 when insuranceType has invalid value', async () => {
      await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00', insuranceType: 'plano_de_saude' })
        .expect(400)
    })

    it('GET /appointments?status=confirmed filters correctly', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/appointments')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ patientId, date: futureDate, startTime: '08:00' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/appointments/${created.id}/confirm`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/appointments')
        .set('Cookie', `access_token=${adminToken}`)
        .query({ status: 'confirmed' })
        .expect(200)

      expect(body.data.every((a: any) => a.status === AppointmentStatus.CONFIRMED)).toBe(true)
    })
  })
})
