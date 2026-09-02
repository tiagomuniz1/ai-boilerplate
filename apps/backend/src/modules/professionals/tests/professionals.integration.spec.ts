import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { CouncilType, SubscriptionPlan, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Professional } from '../entities/professional.entity'
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

describe('ProfessionalsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let professionalRepository: Repository<Professional>
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
    professionalRepository = module.get(getRepositoryToken(Professional))
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
        email: 'auth@professionals.test',
        password: hashedPassword,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    authUserId = authUser.id
    accessToken = await loginUser('auth@professionals.test', password)

    const defaultSpecialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Cardiologia' }),
    )
    defaultSpecialtyId = defaultSpecialty.id

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Test Doctor User',
        email: 'doctor@professionals.test',
        password: hashedPassword,
        role: UserRole.PROFESSIONAL,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    doctorToken = await loginUser('doctor@professionals.test', password)

    const professionalEntity = professionalRepository.create({ userId: doctorUser.id, clinicId: SEED_CLINIC_ID })
    professionalEntity.registrations = [
      { clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true },
    ] as any
    professionalEntity.professionalSpecialties = [{ specialtyId: defaultSpecialty.id, registryNumber: null }] as any
    const professionalProfile = await professionalRepository.save(professionalEntity)
    doctorProfileId = professionalProfile.id

    await userRepository.save(
      userRepository.create({
        fullName: 'Test Regular User',
        email: 'user@professionals.test',
        password: hashedPassword,
        role: UserRole.USER,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    userToken = await loginUser('user@professionals.test', password)

    await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Without Profile',
        email: 'noprofile.doctor@professionals.test',
        password: hashedPassword,
        role: UserRole.PROFESSIONAL,
        isActive: true,
        clinicId: SEED_CLINIC_ID,
      }),
    )
    doctorWithoutProfileToken = await loginUser('noprofile.doctor@professionals.test', password)
  })

  afterEach(async () => {
    await professionalRepository.query('DELETE FROM test.schedules')
    await professionalRepository.query('DELETE FROM test.professional_specialties')
    await professionalRepository.query('DELETE FROM test.professional_registrations')
    await professionalRepository.query('DELETE FROM test.professionals')
    await professionalRepository.query('DELETE FROM test.patients')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await professionalRepository.query('DELETE FROM test.refresh_tokens')
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

  function registrationToArray(registrationNumber: string) {
    const [number, state] = registrationNumber.split('/')
    return [{ councilType: CouncilType.CRM, number, state, isPrimary: true }]
  }

  function makePayload(userId: string, overrides: Partial<{
    crmNumber: string
    specialtyIds: string[]
    bio: string
  }> = {}) {
    const payload: Record<string, unknown> = {
      userId,
      registrations:
        overrides.crmNumber !== undefined
          ? registrationToArray(overrides.crmNumber)
          : [{ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
      specialties:
        overrides.specialtyIds !== undefined
          ? overrides.specialtyIds.map((specialtyId) => ({ specialtyId }))
          : [{ specialtyId: defaultSpecialtyId }],
    }
    if (overrides.bio !== undefined) payload.bio = overrides.bio
    return payload
  }

  function createProfessional(userId: string, overrides = {}) {
    return request(app.getHttpServer())
      .post('/professionals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(makePayload(userId, overrides))
  }

  describe('POST /professionals', () => {
    it('returns 201 with ProfessionalResponseDto on success', async () => {
      const targetUser = await createTargetUser()

      const { body } = await createProfessional(targetUser.id).expect(201)

      expect(body.id).toBeDefined()
      expect(body.user.id).toBe(targetUser.id)
      expect(body.user.fullName).toBe(targetUser.fullName)
      expect(body.user.email).toBe(targetUser.email)
      expect(body.registrations).toHaveLength(1)
      expect(body.registrations[0]).toMatchObject({ councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true })
      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
      expect(body.specialties[0].name).toBe('Cardiologia')
      expect(body.specialties[0].registryNumber).toBeNull()
      expect(body.bio).toBeNull()
      expect(body.createdAt).toBeDefined()
      expect(body.updatedAt).toBeDefined()
    })

    it('returns 201 for a generalist professional with no specialties', async () => {
      const targetUser = await createTargetUser()

      const { body } = await createProfessional(targetUser.id, { specialtyIds: [] }).expect(201)

      expect(body.registrations).toHaveLength(1)
      expect(body.specialties).toHaveLength(0)
    })

    it('response never contains version, deletedAt or password', async () => {
      const targetUser = await createTargetUser()
      const { body } = await createProfessional(targetUser.id).expect(201)

      expect(body.version).toBeUndefined()
      expect(body.deletedAt).toBeUndefined()
      expect(body.user.password).toBeUndefined()
    })

    it('returns 404 when userId does not exist', async () => {
      await createProfessional(faker.string.uuid()).expect(404)
    })

    it('returns 409 when user already has a professional profile', async () => {
      const targetUser = await createTargetUser()
      await createProfessional(targetUser.id).expect(201)
      await createProfessional(targetUser.id, { crmNumber: '99999/RJ' }).expect(409)
    })

    it('returns 409 when registration number is already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()

      await createProfessional(user1.id, { crmNumber: '99999/RJ' }).expect(201)
      await createProfessional(user2.id, { crmNumber: '99999/RJ' }).expect(409)
    })

    it('returns 422 when a specialtyId does not exist', async () => {
      const targetUser = await createTargetUser()
      await createProfessional(targetUser.id, { specialtyIds: [faker.string.uuid()] }).expect(422)
    })

    it('returns 400 when CRM format is invalid', async () => {
      const targetUser = await createTargetUser()
      await createProfessional(targetUser.id, { crmNumber: '123-SP' }).expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...makePayload(targetUser.id), unknownField: 'value' })
        .expect(400)
    })

    it('creates professional with multiple specialties', async () => {
      const targetUser = await createTargetUser()
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )

      const { body } = await createProfessional(targetUser.id, {
        specialtyIds: [defaultSpecialtyId, neurology.id],
      }).expect(201)

      expect(body.specialties).toHaveLength(2)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).post('/professionals').send({}).expect(401)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(makePayload(targetUser.id))
        .expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      const targetUser = await createTargetUser()
      await request(app.getHttpServer())
        .post('/professionals')
        .set('Authorization', `Bearer ${userToken}`)
        .send(makePayload(targetUser.id))
        .expect(403)
    })
  })

  describe('GET /professionals/me', () => {
    it('returns the caller own professional profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/professionals/me')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(doctorProfileId)
    })

    // Não ter ficha é uma resposta comum, não uma falha: 404 faria o React Query
    // tratar como erro e repetir a chamada.
    it('returns 200 with null when the caller has no professional profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/professionals/me')
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .expect(200)

      expect(body).toEqual({})
    })

    it('returns null for an ADMIN who does not practise', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/professionals/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body).toEqual({})
    })
  })

  describe('GET /professionals', () => {
    it('returns 200 with paginated response', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createProfessional(user1.id, { crmNumber: '11111/SP' })
      await createProfessional(user2.id, { crmNumber: '22222/SP' })

      const { body } = await request(app.getHttpServer())
        .get('/professionals')
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

      await createProfessional(user1.id, { crmNumber: '11111/SP' })
      await createProfessional(user2.id, { crmNumber: '22222/SP', specialtyIds: [neurology.id] })

      const { body } = await request(app.getHttpServer())
        .get('/professionals?search=Cardio')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data.some((p: any) => p.specialties.some((s: any) => s.name === 'Cardiologia'))).toBe(true)
      expect(body.data.every((p: any) => p.specialties.every((s: any) => s.name !== 'Neurologia'))).toBe(true)
    })

    it('response data never contains version', async () => {
      const targetUser = await createTargetUser()
      await createProfessional(targetUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/professionals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      body.data.forEach((p: any) => {
        expect(p.version).toBeUndefined()
      })
    })

    it('returns 400 when limit exceeds 100', async () => {
      await request(app.getHttpServer())
        .get('/professionals?limit=101')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400)
    })

    it('excludes professional from list when linked user is soft-deleted', async () => {
      const activeUser = await createTargetUser()
      const deletedUser = await createTargetUser()
      await createProfessional(activeUser.id, { crmNumber: '11111/SP' }).expect(201)
      const { body: deletedProfessional } = await createProfessional(deletedUser.id, { crmNumber: '22222/SP' }).expect(201)

      await userRepository.softDelete(deletedUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/professionals')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const returnedIds = body.data.map((p: any) => p.id)
      expect(returnedIds).not.toContain(deletedProfessional.id)
      expect(returnedIds).toContain(
        body.data.find((p: any) => p.user.id === activeUser.id)?.id ?? body.data[0]?.id,
      )
    })

    it('excludes professional from search results when linked user is soft-deleted', async () => {
      const activeUser = await createTargetUser()
      const deletedUser = await userRepository.save(
        userRepository.create({
          fullName: 'Soft Deleted Doctor',
          email: faker.internet.email(),
          password: 'hashed',
          clinicId: SEED_CLINIC_ID,
        }),
      )
      await createProfessional(activeUser.id, { crmNumber: '11111/SP' }).expect(201)
      await createProfessional(deletedUser.id, { crmNumber: '22222/SP' }).expect(201)

      await userRepository.softDelete(deletedUser.id)

      const { body } = await request(app.getHttpServer())
        .get('/professionals?search=Soft')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.data).toHaveLength(0)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/professionals').expect(401)
    })

    it('returns 200 for DOCTOR and shows only own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/professionals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].id).toBe(doctorProfileId)
    })

    it('returns 404 when DOCTOR user has no professional profile', async () => {
      await request(app.getHttpServer())
        .get('/professionals')
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .expect(404)
    })

    it('returns 200 for USER and shows all professionals', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/professionals')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.data.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /professionals/:id', () => {
    it('returns 200 with ProfessionalResponseDto including specialties', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.user.id).toBe(targetUser.id)
      expect(body.specialties).toHaveLength(1)
      expect(body.version).toBeUndefined()
    })

    it('returns 404 when professional does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/professionals/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when linked user is soft-deleted', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await userRepository.softDelete(targetUser.id)

      await request(app.getHttpServer())
        .get(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get(`/professionals/${faker.string.uuid()}`).expect(401)
    })

    it('returns 200 when DOCTOR views own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(doctorProfileId)
    })

    it('returns 403 when DOCTOR tries to view another professional profile', async () => {
      const targetUser = await createTargetUser()
      const { body: otherProfessional } = await createProfessional(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .get(`/professionals/${otherProfessional.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 200 for USER viewing any professional', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)

      expect(body.id).toBe(doctorProfileId)
    })

    it('returns 403 when DOCTOR user has no profile (treated as forbidden)', async () => {
      await request(app.getHttpServer())
        .get(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .expect(403)
    })
  })

  describe('PATCH /professionals/:id', () => {
    it('returns 200 with updated specialties', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )

      const { body } = await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: neurology.id, registryNumber: '7788' }] })
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].name).toBe('Neurologia')
      expect(body.specialties[0].registryNumber).toBe('7788')
      expect(body.registrations).toEqual(created.registrations)
    })

    it('replaces specialties completely when specialtyIds is provided', async () => {
      const targetUser = await createTargetUser()
      const neurology = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Neurologia' }),
      )
      const { body: created } = await createProfessional(targetUser.id, {
        specialtyIds: [defaultSpecialtyId, neurology.id],
      }).expect(201)

      expect(created.specialties).toHaveLength(2)

      const { body } = await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: defaultSpecialtyId }] })
        .expect(200)

      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
    })

    it('does not change specialties when specialtyIds is not provided', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'Updated bio' })
        .expect(200)

      expect(body.specialties).toHaveLength(1)
      expect(body.specialties[0].id).toBe(defaultSpecialtyId)
    })

    it('returns 404 when professional does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/professionals/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'test' })
        .expect(404)
    })

    it('returns 409 when updating to a registration number already in use', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      await createProfessional(user1.id, { crmNumber: '11111/SP' }).expect(201)
      const { body: p2 } = await createProfessional(user2.id, { crmNumber: '22222/SP' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/professionals/${p2.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ registrations: [{ councilType: CouncilType.CRM, number: '11111', state: 'SP', isPrimary: true }] })
        .expect(409)
    })

    it('returns 422 when updating with a non-existent specialtyId', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ specialties: [{ specialtyId: faker.string.uuid() }] })
        .expect(422)
    })

    it('returns 400 when trying to update with invalid CRM format', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ registrations: [{ councilType: CouncilType.CRM, number: 'INVALID', state: 'SP', isPrimary: true }] })
        .expect(400)
    })

    it('response never contains version', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'test' })
        .expect(200)

      expect(body.version).toBeUndefined()
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer())
        .patch(`/professionals/${faker.string.uuid()}`)
        .send({ bio: 'test' })
        .expect(401)
    })

    it('returns 200 when DOCTOR updates own profile', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ bio: 'My biography' })
        .expect(200)

      expect(body.bio).toBe('My biography')
    })

    it('returns 403 when DOCTOR tries to update another professional profile', async () => {
      const targetUser = await createTargetUser()
      const { body: otherProfessional } = await createProfessional(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .patch(`/professionals/${otherProfessional.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })

    it('returns 403 when USER tries to update', async () => {
      await request(app.getHttpServer())
        .patch(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })

    it('returns 403 when DOCTOR user has no profile', async () => {
      await request(app.getHttpServer())
        .patch(`/professionals/${doctorProfileId}`)
        .set('Authorization', `Bearer ${doctorWithoutProfileToken}`)
        .send({ bio: 'Hacked' })
        .expect(403)
    })
  })

  describe('DELETE /professionals/:id', () => {
    it('returns 204 on successful soft delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)
    })

    it('sets deleted_at on the record (soft delete)', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const deleted = await professionalRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 404 when professional does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/professionals/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when searching by id after deletion', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('returns 404 when trying to delete an already deleted professional', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('allows creating a new professional with a previously soft-deleted registration', async () => {
      const user1 = await createTargetUser()
      const user2 = await createTargetUser()
      const { body: created } = await createProfessional(user1.id, { crmNumber: '55555/MG' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      await createProfessional(user2.id, { crmNumber: '55555/MG' }).expect(201)
    })

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).delete(`/professionals/${faker.string.uuid()}`).expect(401)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id, { crmNumber: '33333/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('soft-deletes the linked user when DOCTOR-role user professional profile is deleted', async () => {
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 1)
      const doctorRoleUser = await userRepository.save(
        userRepository.create({
          fullName: 'Doctor Role User',
          email: 'doctorrole@professionals.test',
          password: hashedPassword,
          role: UserRole.PROFESSIONAL,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )
      const { body: created } = await createProfessional(doctorRoleUser.id, { crmNumber: '44444/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: doctorRoleUser.id }, withDeleted: true })
      expect(user?.deletedAt).not.toBeNull()
    })

    it('does not delete linked user when user role is not DOCTOR', async () => {
      const targetUser = await createTargetUser()
      const { body: created } = await createProfessional(targetUser.id, { crmNumber: '44440/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: targetUser.id }, withDeleted: true })
      expect(user?.deletedAt).toBeNull()
    })

    // Cargo dá escopo, ficha dá exercício: um ADMIN que largou a ficha continua
    // administrando. O guard só existe contra a autodestruição, que é o caso do
    // PROFESSIONAL — cujo usuário é apagado junto com a ficha.
    it('lets an admin delete their own professional profile and keeps the user as ADMIN', async () => {
      const { body: created } = await createProfessional(authUserId, { crmNumber: '11111/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204)

      const user = await userRepository.findOne({ where: { id: authUserId }, withDeleted: true })
      expect(user?.deletedAt).toBeNull()
      expect(user?.role).toBe(UserRole.ADMIN)
      expect(user?.isActive).toBe(true)

      const professional = await professionalRepository.findOne({ where: { id: created.id }, withDeleted: true })
      expect(professional?.deletedAt).not.toBeNull()
    })

    it('returns 403 when a PROFESSIONAL tries to delete their own profile', async () => {
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 1)
      const selfUser = await userRepository.save(
        userRepository.create({
          fullName: 'Self Deleting Professional',
          email: 'selfdelete@professionals.test',
          password: hashedPassword,
          role: UserRole.PROFESSIONAL,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )
      const { body: created } = await createProfessional(selfUser.id, { crmNumber: '77777/SP' }).expect(201)

      const selfToken = await loginUser(selfUser.email, password)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
        .set('Authorization', `Bearer ${selfToken}`)
        .expect(403)
    })

    it('linked DOCTOR-role user no longer appears in users list after professional deletion', async () => {
      const password = 'Password123!'
      const hashedPassword = await bcrypt.hash(password, 1)
      const doctorRoleUser = await userRepository.save(
        userRepository.create({
          fullName: 'Another Doctor Role User',
          email: 'anotherdoctorrole@professionals.test',
          password: hashedPassword,
          role: UserRole.PROFESSIONAL,
          isActive: true,
          clinicId: SEED_CLINIC_ID,
        }),
      )
      const { body: created } = await createProfessional(doctorRoleUser.id, { crmNumber: '55555/SP' }).expect(201)

      await request(app.getHttpServer())
        .delete(`/professionals/${created.id}`)
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

  describe('subscription plan cap (POST /professionals)', () => {
    // The seed already registers one professional in SEED_CLINIC_ID, so the clinic
    // starts with 1. On Solo (cap 1) it is therefore already full.
    it('blocks creating a professional beyond the plan cap (Solo = 1)', async () => {
      await clinicRepository.update(SEED_CLINIC_ID, { plan: SubscriptionPlan.SOLO })
      const target = await createTargetUser()

      const { body } = await createProfessional(target.id, { crmNumber: '22222/SP' }).expect(422)
      expect(body.detail).toContain('Solo')
    })

    it('allows additional professionals on the Free plan (default, unlimited)', async () => {
      const u1 = await createTargetUser()
      const u2 = await createTargetUser()

      await createProfessional(u1.id, { crmNumber: '33333/SP' }).expect(201)
      await createProfessional(u2.id, { crmNumber: '44444/SP' }).expect(201)
    })

    it('allows creation right up to the cap (Clínica = 5)', async () => {
      await clinicRepository.update(SEED_CLINIC_ID, { plan: SubscriptionPlan.CLINICA })
      // Clinic already has 1 seeded professional; add 4 more to reach the cap of 5.
      for (let i = 0; i < 4; i++) {
        const u = await createTargetUser()
        await createProfessional(u.id, { crmNumber: `5000${i}/SP` }).expect(201)
      }
      const overflow = await createTargetUser()
      await createProfessional(overflow.id, { crmNumber: '50009/SP' }).expect(422)
    })
  })
})
