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
import { Vaccine } from '../entities/vaccine.entity'

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
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-key'
process.env.JWT_EXPIRATION = '900s'
process.env.JWT_REFRESH_EXPIRATION = '7d'
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000'

describe('VaccinesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let vaccineRepository: Repository<Vaccine>
  let platformAdminToken: string
  let adminToken: string
  let doctorToken: string
  let userToken: string

  async function loginAs(role: UserRole): Promise<string> {
    const password = 'Password123!'
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role} User`,
        email: `${role}.${faker.string.alphanumeric(6)}@vaccines.test`,
        password: await bcrypt.hash(password, 1),
        role,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: 'seed-clinic' })

    const raw = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(raw) ? raw : [raw]
    const match = cookies.find((c: string) => c?.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
  }

  async function loginAsPlatformAdmin(): Promise<string> {
    const password = 'Password123!'
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Platform Admin',
        email: `platform.${faker.string.alphanumeric(6)}@vaccines.test`,
        password: await bcrypt.hash(password, 1),
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })

    const raw = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(raw) ? raw : [raw]
    const match = cookies.find((c: string) => c?.startsWith('access_token='))
    return match ? match.slice('access_token='.length).split(';')[0] : ''
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = module.createNestApplication()
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    )
    await app.listen(0)

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    vaccineRepository = module.get(getRepositoryToken(Vaccine))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )
    platformAdminToken = await loginAsPlatformAdmin()
    adminToken = await loginAs(UserRole.ADMIN)
    doctorToken = await loginAs(UserRole.PROFESSIONAL)
    userToken = await loginAs(UserRole.USER)
  })

  afterEach(async () => {
    await vaccineRepository.query('DELETE FROM test.vaccines')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  const payload = (overrides = {}) => ({
    name: 'Tríplice viral',
    abbreviation: 'SCR',
    preventedDiseases: 'sarampo, caxumba, rubéola',
    ...overrides,
  })

  describe('POST /vaccines', () => {
    it('creates as PLATFORM_ADMIN → 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Tríplice viral')
      expect(body.isActive).toBe(true)
    })

    // O catálogo é da plataforma: a clínica lê para escolher, nunca cura.
    it('returns 403 for a clinic ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload())
        .expect(403)
    })

    it('returns 403 for a PROFESSIONAL', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(403)
    })

    // Duas vacinas homônimas não seriam distinguíveis no seletor.
    it('returns 409 on a duplicate name ignoring case', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload({ name: 'TRÍPLICE VIRAL' }))
        .expect(409)
    })

    it('returns 400 when an unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload({ isActive: false }))
        .expect(400)
    })
  })

  describe('GET /vaccines', () => {
    it('lists for a clinic ADMIN → 200', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/vaccines')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data[0].name).toBe('Tríplice viral')
    })

    it('returns 403 for a receptionist', async () => {
      await request(app.getHttpServer())
        .get('/vaccines')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('finds by prevented disease, not just by name', async () => {
      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/vaccines?search=rub')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
    })

    // Desativar tira da lista de quem prescreve, sem apagar o histórico.
    it('hides an inactive vaccine from the clinic and shows it to the platform', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/vaccines/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body: clinicView } = await request(app.getHttpServer())
        .get('/vaccines?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
      expect(clinicView.total).toBe(0)

      const { body: platformView } = await request(app.getHttpServer())
        .get('/vaccines?includeInactive=true')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)
      expect(platformView.total).toBe(1)
    })
  })

  describe('DELETE /vaccines/:id', () => {
    it('soft deletes as PLATFORM_ADMIN → 204', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccines/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      const stored = await vaccineRepository.findOne({ where: { id: created.id }, withDeleted: true })
      expect(stored?.deletedAt).not.toBeNull()
    })

    // O índice único é parcial no soft delete: o nome volta a ficar livre.
    it('lets the same name be created again after deletion', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccines/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .post('/vaccines')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send(payload())
        .expect(201)
    })

    it('returns 404 when it does not exist', async () => {
      await request(app.getHttpServer())
        .delete('/vaccines/00000000-0000-4000-8000-00000000dead')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })
  })
})
