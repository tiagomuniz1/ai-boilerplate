import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { DayOfWeek, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../entities/schedule.entity'

const SEED_CLINIC_ID = '10000000-0000-0000-0000-000000000000'

process.env.NODE_ENV = 'test'
process.env.DB_SCHEMA = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'

describe('SchedulesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>

  let doctorToken: string
  let adminToken: string
  let userToken: string
  let doctorWithoutProfileToken: string
  let doctorUserId: string
  let otherDoctorToken: string
  let doctorId: string
  let otherDoctorId: string

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
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
  })

  beforeEach(async () => {
    await scheduleRepository.query('DELETE FROM test.schedules')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await doctorRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    const password = 'Password123!'
    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@schedules.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUserRecord = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor User',
        email: 'doctor@schedules.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    doctorUserId = doctorUserRecord.id

    const otherDoctorUserRecord = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other.doctor@schedules.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@schedules.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Without Profile',
        email: 'noprofile@schedules.test',
        password: hashed,
        role: UserRole.DOCTOR,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const cardiologia = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Cardiologia' }),
    )
    const neurologia = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Neurologia' }),
    )

    const doctorEntity = doctorRepository.create({ userId: doctorUserId, crmNumber: '11111/SP', clinicId: SEED_CLINIC_ID })
    doctorEntity.specialties = [cardiologia]
    const doctorProfile = await doctorRepository.save(doctorEntity)
    doctorId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUserRecord.id,
      crmNumber: '22222/SP',
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.specialties = [neurologia]
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token='))
      return match ? match.slice('access_token='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@schedules.test')
    doctorToken = await loginAndExtractToken('doctor@schedules.test')
    otherDoctorToken = await loginAndExtractToken('other.doctor@schedules.test')
    userToken = await loginAndExtractToken('user@schedules.test')
    doctorWithoutProfileToken = await loginAndExtractToken('noprofile@schedules.test')
  })

  afterAll(async () => {
    await scheduleRepository.query('DELETE FROM test.schedules')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await doctorRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  function makeSchedulePayload(overrides: Record<string, unknown> = {}) {
    return {
      dayOfWeek: DayOfWeek.MONDAY,
      startTime: '08:00',
      endTime: '12:00',
      slotDurationInMinutes: 30,
      ...overrides,
    }
  }

  function createScheduleAsDoctor(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/schedules')
      .set('Cookie', `access_token=${doctorToken}`)
      .send(makeSchedulePayload(overrides))
  }

  function createScheduleAsAdmin(overrides: Record<string, unknown> = {}) {
    return request(app.getHttpServer())
      .post('/schedules')
      .set('Cookie', `access_token=${adminToken}`)
      .send(makeSchedulePayload({ doctorId, ...overrides }))
  }

  describe('POST /schedules', () => {
    it('returns 201 when doctor creates schedule (uses currentUser.id, ignores dto.doctorId)', async () => {
      const { body } = await createScheduleAsDoctor({ doctorId: faker.string.uuid() }).expect(201)

      expect(body.id).toBeDefined()
      expect(body.doctorId).toBe(doctorId)
      expect(body.dayOfWeek).toBe(DayOfWeek.MONDAY)
      expect(body.startTime).toBe('08:00')
      expect(body.endTime).toBe('12:00')
      expect(body.slotDurationInMinutes).toBe(30)
      expect(body.validFrom).toBeNull()
      expect(body.validUntil).toBeNull()
      expect(body.version).toBeUndefined()
    })

    it('returns 422 when admin omits doctorId', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${adminToken}`)
        .send(makeSchedulePayload())
        .expect(422)
    })

    it('returns 404 when admin sends inexistent doctorId', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${adminToken}`)
        .send(makeSchedulePayload({ doctorId: faker.string.uuid() }))
        .expect(404)
    })

    it('returns 201 when admin creates schedule with valid doctorId', async () => {
      const { body } = await createScheduleAsAdmin().expect(201)
      expect(body.doctorId).toBe(doctorId)
    })

    it('returns 422 when validFrom >= validUntil', async () => {
      await createScheduleAsDoctor({ validFrom: '2025-06-01', validUntil: '2025-01-01' }).expect(422)
    })

    it('returns 422 when validFrom equals validUntil', async () => {
      await createScheduleAsDoctor({ validFrom: '2025-01-01', validUntil: '2025-01-01' }).expect(422)
    })

    it('returns 201 with only validFrom (open-ended validity)', async () => {
      const { body } = await createScheduleAsDoctor({ validFrom: '2025-01-01' }).expect(201)
      expect(body.validFrom).toBe('2025-01-01')
      expect(body.validUntil).toBeNull()
    })

    it('returns 422 when startTime >= endTime', async () => {
      await createScheduleAsDoctor({ startTime: '12:00', endTime: '08:00' }).expect(422)
    })

    it('returns 400 when startTime has invalid format', async () => {
      await createScheduleAsDoctor({ startTime: '8:00' }).expect(400)
    })

    it('returns 422 when interval not divisible by slotDurationInMinutes', async () => {
      await createScheduleAsDoctor({ startTime: '08:00', endTime: '09:00', slotDurationInMinutes: 40 }).expect(422)
    })

    it('returns 400 when slotDurationInMinutes < 15', async () => {
      await createScheduleAsDoctor({ slotDurationInMinutes: 14 }).expect(400)
    })

    it('returns 400 when slotDurationInMinutes > 120', async () => {
      await createScheduleAsDoctor({ slotDurationInMinutes: 121 }).expect(400)
    })

    it('returns 409 when schedule overlaps existing one', async () => {
      await createScheduleAsDoctor().expect(201)
      await createScheduleAsDoctor({ startTime: '10:00', endTime: '14:00' }).expect(409)
    })

    it('returns 201 when same time slot on different day', async () => {
      await createScheduleAsDoctor().expect(201)
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.TUESDAY }).expect(201)
    })

    it('returns 201 for two schedules with same time but non-intersecting validity', async () => {
      await createScheduleAsDoctor({ validFrom: '2025-01-01', validUntil: '2025-03-31' }).expect(201)
      await createScheduleAsDoctor({ validFrom: '2025-04-01', validUntil: '2025-06-30' }).expect(201)
    })

    it('returns 409 for two schedules with same time and intersecting validity', async () => {
      await createScheduleAsDoctor({ validFrom: '2025-01-01', validUntil: '2025-06-30' }).expect(201)
      await createScheduleAsDoctor({ validFrom: '2025-04-01', validUntil: '2025-12-31' }).expect(409)
    })

    it('returns 409 when new schedule has no validity (overlaps with everything)', async () => {
      await createScheduleAsDoctor({ startTime: '08:00', endTime: '12:00' }).expect(201)
      await createScheduleAsDoctor({ startTime: '10:00', endTime: '14:00' }).expect(409)
    })

    it('returns 400 when unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...makeSchedulePayload(), unknownField: 'value' })
        .expect(400)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).post('/schedules').send(makeSchedulePayload()).expect(401)
    })

    it('returns 403 when USER tries to create', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${userToken}`)
        .send(makeSchedulePayload())
        .expect(403)
    })

    it('returns 404 when DOCTOR user has no doctor profile', async () => {
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${doctorWithoutProfileToken}`)
        .send(makeSchedulePayload())
        .expect(404)
    })
  })

  describe('GET /schedules', () => {
    it('doctor only sees own schedules even if doctorId param is different', async () => {
      await createScheduleAsDoctor().expect(201)
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(makeSchedulePayload({ dayOfWeek: DayOfWeek.TUESDAY }))
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/schedules?doctorId=${otherDoctorId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.data.every((s: any) => s.doctorId === doctorId)).toBe(true)
    })

    it('admin without filter returns all schedules', async () => {
      await createScheduleAsDoctor().expect(201)
      await request(app.getHttpServer())
        .post('/schedules')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(makeSchedulePayload({ dayOfWeek: DayOfWeek.TUESDAY }))
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/schedules')
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.total).toBeGreaterThanOrEqual(2)
    })

    it('admin filters by doctorId', async () => {
      await createScheduleAsDoctor().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/schedules?doctorId=${doctorId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data.every((s: any) => s.doctorId === doctorId)).toBe(true)
    })

    it('filters by dayOfWeek', async () => {
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.MONDAY }).expect(201)
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.TUESDAY }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/schedules?dayOfWeek=MONDAY`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.data.every((s: any) => s.dayOfWeek === DayOfWeek.MONDAY)).toBe(true)
    })

    it('returns all schedules by default regardless of validity period', async () => {
      await createScheduleAsDoctor({ validFrom: '2020-01-01', validUntil: '2020-12-31' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/schedules')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
    })

    it('filters out expired schedules when activeOn is provided', async () => {
      await createScheduleAsDoctor({ validFrom: '2020-01-01', validUntil: '2020-12-31' }).expect(201)
      const today = new Date().toISOString().split('T')[0]

      const { body } = await request(app.getHttpServer())
        .get(`/schedules?activeOn=${today}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(0)
    })

    it('returns expired schedule when activeOn matches its validity', async () => {
      await createScheduleAsDoctor({ validFrom: '2020-01-01', validUntil: '2020-12-31' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/schedules?activeOn=2020-06-15')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
    })

    it('respects pagination parameters', async () => {
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.MONDAY }).expect(201)
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.TUESDAY }).expect(201)
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.WEDNESDAY }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/schedules?page=1&limit=1')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.total).toBeGreaterThanOrEqual(3)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(1)
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/schedules?limit=101')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(400)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/schedules').expect(401)
    })

    it('returns 403 when USER tries to list', async () => {
      await request(app.getHttpServer())
        .get('/schedules')
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('GET /schedules/:id', () => {
    it('returns 200 with correct data as doctor owner', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.version).toBeUndefined()
    })

    it('returns 200 as admin for any schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
    })

    it('returns 403 when doctor tries to view another doctor schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .get(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 404 when schedule not found', async () => {
      await request(app.getHttpServer())
        .get(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/schedules/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when USER tries to view', async () => {
      await request(app.getHttpServer())
        .get(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('PATCH /schedules/:id', () => {
    it('returns 200 on successful update by owner', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(200)

      expect(body.slotDurationInMinutes).toBe(60)
    })

    it('returns 403 when doctor tries to update another doctor schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(403)
    })

    it('allows admin to update any schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(200)
    })

    it('returns 422 when update causes startTime >= endTime', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ startTime: '14:00' })
        .expect(422)
    })

    it('returns 422 when update causes indivisible interval', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ slotDurationInMinutes: 70 })
        .expect(422)
    })

    it('clears validUntil when null is sent', async () => {
      const { body: created } = await createScheduleAsDoctor({
        validUntil: '2030-12-31',
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ validUntil: null })
        .expect(200)

      expect(body.validUntil).toBeNull()
    })

    it('preserves existing fields when not sent in update', async () => {
      const { body: created } = await createScheduleAsDoctor({ validFrom: '2025-01-01' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(200)

      expect(body.validFrom).toBe('2025-01-01')
    })

    it('returns 409 when update overlaps another schedule', async () => {
      await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.TUESDAY, startTime: '08:00', endTime: '12:00' }).expect(201)
      const { body: second } = await createScheduleAsDoctor({ dayOfWeek: DayOfWeek.TUESDAY, startTime: '13:00', endTime: '17:00' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${second.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ startTime: '11:00' })
        .expect(409)
    })

    it('returns 422 when update causes validFrom >= validUntil', async () => {
      const { body: created } = await createScheduleAsDoctor({ validUntil: '2025-06-01' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ validFrom: '2025-12-01' })
        .expect(422)
    })

    it('clears validFrom when null is sent', async () => {
      const { body: created } = await createScheduleAsDoctor({ validFrom: '2025-01-01' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ validFrom: null })
        .expect(200)

      expect(body.validFrom).toBeNull()
    })

    it('returns 404 when schedule not found', async () => {
      await request(app.getHttpServer())
        .patch(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/schedules/${faker.string.uuid()}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(401)
    })

    it('returns 403 when USER tries to update', async () => {
      await request(app.getHttpServer())
        .patch(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${userToken}`)
        .send({ slotDurationInMinutes: 60 })
        .expect(403)
    })
  })

  describe('DELETE /schedules/:id', () => {
    it('returns 204 and sets deletedAt on owner delete', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .delete(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)

      const deleted = await scheduleRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 403 when doctor tries to delete another doctor schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .delete(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('allows admin to delete any schedule', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .delete(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)
    })

    it('returns 404 when searching deleted schedule by id', async () => {
      const { body: created } = await createScheduleAsDoctor().expect(201)

      await request(app.getHttpServer())
        .delete(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/schedules/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)
    })

    it('returns 404 when schedule not found', async () => {
      await request(app.getHttpServer())
        .delete(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).delete(`/schedules/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when USER tries to delete', async () => {
      await request(app.getHttpServer())
        .delete(`/schedules/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })
})
