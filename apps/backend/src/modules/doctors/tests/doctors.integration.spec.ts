import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../entities/doctor.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'

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

describe('DoctorsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let specialtyRepository: Repository<Specialty>
  let accessToken: string
  let authUserId: string
  let defaultSpecialtyId: string
  let doctorToken: string
  let doctorProfileId: string
  let doctorWithoutProfileToken: string
  let userToken: string

  async function loginUser(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password, slug: 'seed-clinic' })
    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string | undefined
    if (!setCookieHeader) return ''
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c?.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    doctorRepository = module.get(getRepositoryToken(Doctor))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)

    const authUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Auth User',
        email: 'auth@doctors.test',
        password: hashedPassword,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    authUserId = authUser.id
    accessToken = await loginUser('auth@doctors.test', password)

    const defaultSpecialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Cardiologia' }),
    )
    defaultSpecialtyId = defaultSpecialty.id

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Doctor User',
        email: 'doctor@doctors.test',
        password: hashedPassword,
        role: UserRole.DOCTOR,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    doctorToken = await loginUser('doctor@doctors.test', password)

    const doctorEntity = doctorRepository.create({ userId: doctorUser.id, clinicId: SEED_CLINIC_ID })
    doctorEntity.crms = [{ clinicId: SEED_CLINIC_ID, number: '99999', state: 'SP', isPrimary: true }] as any
    doctorEntity.doctorSpecialties = [{ specialtyId: defaultSpecialty.id, rqe: null }] as any
    const doctorProfile = await doctorRepository.save(doctorEntity)
    doctorProfileId = doctorProfile.id

    await userRepository.save(
      userRepository.create({
        fullName: 'Test Regular User',
        email: 'user@doctors.test',
        password: hashedPassword,
        role: UserRole.USER,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    userToken = await loginUser('user@doctors.test', password)

    await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Without Profile',
        email: 'noprofile.doctor@doctors.test',
        password: hashedPassword,
        role: UserRole.DOCTOR,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    doctorWithoutProfileToken = await loginUser('noprofile.doctor@doctors.test', password)
  })

  afterEach(async () => {
    await doctorRepository.query('DELETE FROM test.schedules')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctor_crms')
    await doctorRepository.query('DELETE FROM test.doctors')
    await doctorRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await doctorRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  async function createTargetUser() {
    return userRepository.save(
      userRepository.create({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'hashed',
        clinicId: SEED_CLINIC_ID,
      }),
    )
  }

  function crmToArray(crmNumber: string) {
    const [number, state] = crmNumber.split('/')
    return [{ number, state, isPrimary: true }]
  }

  function makePayload(userId: string, overrides: Partial<{
    crmNumber: string
    specialtyIds: string[]
    bio: string
  }> = {}) {
    const payload: Record<string, unknown> = {
      userId,
      crms: overrides.crmNumber !== undefined ? crmToArray(overrides.crmNumber) : [{ number: '12345', state: 'SP', isPrimary: true }],
      specialties:
        overrides.specialtyIds !== undefined
          ? overrides.specialtyIds.map((specialtyId) => ({ specialtyId }))
          : [{ specialtyId: defaultSpecialtyId }],
    }
    if (overrides.bio !== undefined) payload.bio = overrides.bio
    return payload
  }

  function createDoctor(userId: string, overrides = {}) {
    return request(app.getHttpServer())
      .post('/doctors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(makePayload(userId, overrides))
  }

  describe('POST /doctors', () => {
    it('returns 201 with DoctorResponseDto on success', async () => {
      const targetUser = await createTargetUser()
      const payload = makePayload(targetUser.id)

      const { body } = await createDoctor(targetUser.id).expect(201)

      expect(body.id).toBeDefined()
      expect(body.user.id).toBe(targetUser.id)
      expect(body.user.fullName).toBe(targetUser.fullName)
      expect(body.user.email).toBe(targetUser.email)
      expect(body.crms).toHaveLength(1)
      expect(body.crms[0]).toMatchObject({ number: '12345', state: 'SP', isPrimary: true })
      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
      expect(body.specialties[0].name).toBe('Cardiologia')
      expect(body.specialties[0].rqe).toBeNull()
      expect(body.bio).toBeNull()
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('response never contains version, deletedAt or password', async () => {
      const targetUser = await createTargetUser()
      const { body } = await createDoctor(targetUser.id).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
      expect(body.user.password).toBeUndefined()
    })

    it('returns 404 when userId does not exist', async () => {
      await createDoctor(faker.string.uuid()).expect(404)
    })

    it('returns 409 when user already has a doctor profile', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id).expect(201)
      await createDoctor(targetUser.id, { crmNumber: '99999/RJ' }).expect(409)
    })

    it('returns 409 when CRM number is already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()

      await createDoctor(user1.id, { crmNumber: '99999/RJ' }).expect(201)
      await createDoctor(user2.id, { crmNumber: '99999/RJ' }).expect(409)
    })

    it('returns 422 when a specialtyId does not exist', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id, { specialtyIds: [faker.string.uuid()] }).expect(422)
    })

    it('returns 400 when CRM format is invalid', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id, { crmNumber: '123-SP' }).expect(400)
    })

    it('returns 400 when specialtyIds is empty', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id, { specialtyIds: [] }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...makePayload(targetUser.id), unknownField: 'value' })
        .expect(400)
    })

    it('creates doctor with multiple specialties', async () => {
      const targetUser = await createTargetUser()
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )

      const { body } = await createDoctor(targetUser.id, {
        specialtyIds: [defaultSpecialtyId, neurology.id],
      }).expect(201)

      expect(body.specialties).toHaveLength(2)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).post('/doctors').send({}).expect(401)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/doctors')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(makePayload(targetUser.id))
        .expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/doctors')
        .set('Authorization', `Bearer ${userToken}`)
        .send(makePayload(targetUser.id))
        .expect(403)
    })
  })

  describe('GET /doctors', () => {
    it('returns 200 with paginated response', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createDoctor(user1.id, { crmNumber: '11111/SP' })
      await createDoctor(user2.id, { crmNumber: '22222/SP' })

      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toBeDefined()
      expect(body.total).toBeGreaterThanOrEqual(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('filters by specialty name via search param', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )

      await createDoctor(user1.id, { crmNumber: '11111/SP' })
      await createDoctor(user2.id, { crmNumber: '22222/SP', specialtyIds: [neurology.id] })

      const { body } = await request(app.getHttpServer())
        .get('/doctors?search=Cardio')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data.some((d: any) => d.specialties.some((s: any) => s.name === 'Cardiologia'))).toBe(true)
      expect(body.data.every((d: any) => d.specialties.every((s: any) => s.name !== 'Neurologia'))).toBe(true)
    })

    it('response data never contains version', async () => {
      const targetUser = await createTargetUser()
      await createDoctor(targetUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      body.data.forEach((d: any) => {
        expect(d.version).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/doctors?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
    })

    it('excludes doctor from list when linked user is soft-deleted', async () => {
      const activeUser = await createTargetUser()
      const deletedUser = await createTargetUser()
      await createDoctor(activeUser.id, { crmNumber: '11111/SP' }).expect(201)
      const { body: deletedDoctor } = await createDoctor(deletedUser.id, { crmNumber: '22222/SP' }).expect(201)

      await userRepository.softDelete(deletedUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const returnedIds = body.data.map((d: any) => d.id)
      expect(returnedIds).not.toContain(deletedDoctor.id)
      expect(returnedIds).toContain(
        body.data.find((d: any) => d.user.id === activeUser.id)?.id ?? body.data[0]?.id,
      )
    })

    it('excludes doctor from search results when linked user is soft-deleted', async () => {
      const activeUser = await createTargetUser()
      const deletedUser = await userRepository.save(
        userRepository.create({
          fullName: 'Soft Deleted Doctor',
          email: faker.internet.email(),
          password: 'hashed',
          clinicId: SEED_CLINIC_ID,
        }),
      )
      await createDoctor(activeUser.id, { crmNumber: '11111/SP' }).expect(201)
      await createDoctor(deletedUser.id, { crmNumber: '22222/SP' }).expect(201)

      await userRepository.softDelete(deletedUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/doctors?search=Soft')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toHaveLength(0)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/doctors').expect(401)
    })

    it('returns 200 for DOCTOR and shows only own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe(doctorProfileId)
    })

    it('returns 404 when DOCTOR user has no doctor profile', async () => {
      await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .expect(404)
    })

    it('returns 200 for USER and shows all doctors', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/doctors')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /doctors/:id', () => {
    it('returns 200 with DoctorResponseDto including specialties', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.user.id).toBe(targetUser.id)
      expect(body.specialties).toHaveLength(1)
      expect(body.version).toBeUndefined()
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when linked user is soft-deleted', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await userRepository.softDelete(targetUser.id)

      await request(app.getHttpServer())
        .get(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/doctors/${faker.string.uuid()}`).expect(401)
    })

    it('returns 200 when DOCTOR views own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(doctorProfileId)
    })

    it('returns 403 when DOCTOR tries to view another doctor profile', async () => {
      const targetUser = await createTargetUser()
      const { body: otherDoctor } = await createDoctor(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .get(`/doctors/${otherDoctor.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 200 for USER viewing any doctor', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.id).toBe(doctorProfileId)
    })

    it('returns 403 when DOCTOR user has no profile (treated as forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .expect(403)
    })
  })

  describe('PATCH /doctors/:id', () => {
    it('returns 200 with updated specialties', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: neurology.id, rqe: '7788' }] })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].name).toBe('Neurologia')
      expect(body.specialties[0].rqe).toBe('7788')
      expect(body.crms).toEqual(created.crms)
    })

    it('replaces specialties completely when specialtyIds is provided', async () => {
      const targetUser = await createTargetUser()
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )
      const { body: created } = await createDoctor(targetUser.id, {
        specialtyIds: [defaultSpecialtyId, neurology.id],
      }).expect(201)

      expect(created.specialties).toHaveLength(2)

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: defaultSpecialtyId }] })
        .expect(200)

      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
    })

    it('does not change specialties when specialtyIds is not provided', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'Updated bio' })
        .expect(200)

      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'test' })
        .expect(404)
    })

    it('returns 409 when updating to a CRM already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createDoctor(user1.id, { crmNumber: '11111/SP' }).expect(201)
      const { body: d2 } = await createDoctor(user2.id, { crmNumber: '22222/SP' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${d2.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ crms: [{ number: '11111', state: 'SP', isPrimary: true }] })
        .expect(409)
    })

    it('returns 422 when updating with a non-existent specialtyId', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: faker.string.uuid() }] })
        .expect(422)
    })

    it('returns 400 when trying to update with invalid CRM format', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ crms: [{ number: 'INVALID', state: 'SP', isPrimary: true }] })
        .expect(400)
    })

    it('response never contains version', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'test' })
        .expect(200)

      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/doctors/${faker.string.uuid()}`)
        .send({ bio: 'test' })
        .expect(401)
    })

    it('returns 200 when DOCTOR updates own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ bio: 'My biography' })
        .expect(200)

      expect(body.bio).toBe('My biography')
    })

    it('returns 403 when DOCTOR tries to update another doctor profile', async () => {
      const targetUser = await createTargetUser()
      const { body: otherDoctor } = await createDoctor(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/doctors/${otherDoctor.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      await request(app.getHttpServer())
        .patch(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })

    it('returns 403 when DOCTOR user has no profile', async () => {
      await request(app.getHttpServer())
        .patch(`/doctors/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })
  })

  describe('DELETE /doctors/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await doctorRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when doctor does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/doctors/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted doctor', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('allows creating a new doctor with a previously soft-deleted CRM', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      const { body: created } = await createDoctor(user1.id, { crmNumber: '55555/MG' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await createDoctor(user2.id, { crmNumber: '55555/MG' }).expect(201)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).delete(`/doctors/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('soft-deletes the linked user when DOCTOR-role user doctor profile is deleted', async () => {
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 1)
      const doctorRoleUser = await userRepository.save(
        userRepository.create({
          fullName: 'Doctor Role User',
          email: 'doctorrole@doctors.test',
          password: hashedPassword,
          role: UserRole.DOCTOR,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )
      const { body: created } = await createDoctor(doctorRoleUser.id, { crmNumber: '44444/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: doctorRoleUser.id }, withDeleted: true })
      expect(user?.deletedAt).not.toBeNull()
    })

    it('does not delete linked user when user role is not DOCTOR', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createDoctor(targetUser.id, { crmNumber: '44440/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: targetUser.id }, withDeleted: true })
      expect(user?.deletedAt).toBeNull()
    })

    it('returns 403 when admin tries to delete own doctor profile', async () => {
      const { body: created } = await createDoctor(authUserId, { crmNumber: '11111/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })

    it('linked DOCTOR-role user no longer appears in users list after doctor deletion', async () => {
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 1)
      const doctorRoleUser = await userRepository.save(
        userRepository.create({
          fullName: 'Another Doctor Role User',
          email: 'anotherdoctorrole@doctors.test',
          password: hashedPassword,
          role: UserRole.DOCTOR,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )
      const { body: created } = await createDoctor(doctorRoleUser.id, { crmNumber: '55555/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/doctors/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const { body: usersPage } = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const ids = usersPage.data.map((u: { id: string }) => u.id)
      expect(ids).not.toContain(doctorRoleUser.id)
    })
  })
})
