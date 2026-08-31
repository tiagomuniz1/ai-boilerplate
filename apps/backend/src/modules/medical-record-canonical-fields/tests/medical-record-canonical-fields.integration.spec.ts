import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { MedicalRecordFieldType, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../../users/entities/user.entity'
import { MedicalRecordCanonicalField } from '../entities/medical-record-canonical-field.entity'

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

describe('MedicalRecordCanonicalFieldsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let specialtyRepository: Repository<Specialty>
  let canonicalFieldRepository: Repository<MedicalRecordCanonicalField>
  let platformAdminToken: string
  let adminToken: string
  let doctorToken: string
  let userToken: string

  async function loginAs(role: UserRole): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role} User`,
        email: `${role}.${faker.string.alphanumeric(6)}@canonical.test`,
        password: hashedPassword,
        role,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug: 'seed-clinic' })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const match = cookies.find((c: string) => c.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
  }

  async function loginAsPlatformAdmin(): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: 'Platform Admin',
        email: `platform.${faker.string.alphanumeric(6)}@canonical.test`,
        password: hashedPassword,
        role: UserRole.PLATFORM_ADMIN,
        clinicId: null,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
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
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    canonicalFieldRepository = module.get(getRepositoryToken(MedicalRecordCanonicalField))
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
    await canonicalFieldRepository.query('DELETE FROM test.medical_record_canonical_fields')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await specialtyRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function createField(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/medical-record-canonical-fields')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  const generalField = {
    canonicalKey: 'weight',
    label: 'Peso',
    type: MedicalRecordFieldType.NUMBER,
    unit: 'kg',
  }

  describe('POST /medical-record-canonical-fields', () => {
    it('returns 201 with CanonicalFieldResponseDto on success', async () => {
      const { body } = await createField(platformAdminToken, generalField).expect(201)

      expect(body.id).toBeDefined()
      expect(body.canonicalKey).toBe('weight')
      expect(body.type).toBe('number')
      expect(body.isActive).toBe(true)
    })

    it('returns 201 for a select field with options', async () => {
      const { body } = await createField(platformAdminToken, {
        canonicalKey: 'risk_level',
        label: 'Nível de risco',
        type: MedicalRecordFieldType.SELECT,
        options: [
          { value: 'low', label: 'Baixo' },
          { value: 'high', label: 'Alto' },
        ],
      }).expect(201)

      expect(body.options).toHaveLength(2)
    })

    it('returns 422 when select field has no options', async () => {
      await createField(platformAdminToken, {
        canonicalKey: 'risk_level',
        label: 'Risco',
        type: MedicalRecordFieldType.SELECT,
      }).expect(422)
    })

    it('returns 422 when a non-select field provides options', async () => {
      await createField(platformAdminToken, {
        ...generalField,
        options: [{ value: 'x', label: 'X' }],
      }).expect(422)
    })

    it('returns 409 when canonicalKey is duplicated', async () => {
      await createField(platformAdminToken, generalField).expect(201)
      await createField(platformAdminToken, generalField).expect(409)
    })

    // O catálogo é global: escopo não é mais parte do contrato, e o
    // ValidationPipe (forbidNonWhitelisted) recusa quem tentar mandá-lo.
    it('returns 400 when a specialty scope is sent', async () => {
      await createField(platformAdminToken, {
        ...generalField,
        specialtyId: faker.string.uuid(),
      }).expect(400)
    })

    it('returns 400 when canonicalKey is not a valid slug', async () => {
      await createField(platformAdminToken, { ...generalField, canonicalKey: 'Weight Field' }).expect(400)
    })

    it('returns 400 when an unknown field is sent', async () => {
      await createField(platformAdminToken, { ...generalField, unknownField: 'x' }).expect(400)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/medical-record-canonical-fields')
        .send(generalField)
        .expect(401)
    })

    it('returns 403 when ADMIN tries to create', async () => {
      await createField(adminToken, generalField).expect(403)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createField(doctorToken, generalField).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createField(userToken, generalField).expect(403)
    })
  })

  describe('GET /medical-record-canonical-fields', () => {
    // A regressão que motivou a mudança: antes a listagem sem filtro só
    // devolvia `specialty_id IS NULL`, então campo escopado sumia da tela do
    // backoffice — que nunca teve filtro de especialidade para revelá-lo.
    it('returns every active field, in label order', async () => {
      await createField(platformAdminToken, generalField).expect(201)
      await createField(platformAdminToken, {
        ...generalField,
        canonicalKey: 'ejection_fraction',
        label: 'Fração de ejeção',
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body).toHaveLength(2)
      expect(body.map((f: any) => f.canonicalKey)).toEqual(
        expect.arrayContaining(['weight', 'ejection_fraction']),
      )
      expect(body[0].label.localeCompare(body[1].label)).toBeLessThan(0)
    })

    it('ignores includeInactive for ADMIN (active only)', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)
      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-canonical-fields?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.some((f: any) => f.id === created.id)).toBe(false)
    })

    it('includes inactive fields for PLATFORM_ADMIN when includeInactive=true', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)
      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-canonical-fields?includeInactive=true')
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.some((f: any) => f.id === created.id)).toBe(true)
    })

    it('reflects newly created fields (cache invalidated after create)', async () => {
      await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      await createField(platformAdminToken, generalField).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.some((f: any) => f.canonicalKey === 'weight')).toBe(true)
    })

    it('returns 200 for DOCTOR', async () => {
      await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer()).get('/medical-record-canonical-fields').expect(401)
    })
  })

  describe('GET /medical-record-canonical-fields/:id', () => {
    it('returns 200 with the field for PLATFORM_ADMIN', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
      expect(body.canonicalKey).toBe('weight')
    })

    it('returns 404 when the field does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/medical-record-canonical-fields/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .expect(404)
    })

    it('returns 403 for ADMIN', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      await request(app.getHttpServer())
        .get(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403)
    })

    it('returns 401 when no token is provided', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      await request(app.getHttpServer())
        .get(`/medical-record-canonical-fields/${created.id}`)
        .expect(401)
    })
  })

  describe('PATCH /medical-record-canonical-fields/:id', () => {
    it('returns 200 with the updated field', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ label: 'Peso corporal' })
        .expect(200)

      expect(body.label).toBe('Peso corporal')
    })

    it('deactivates a field so it disappears from listings', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false })
        .expect(200)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-canonical-fields')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.some((f: any) => f.id === created.id)).toBe(false)
    })

    it('returns 404 when the field does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${faker.string.uuid()}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ label: 'Updated label' })
        .expect(404)
    })

    it('returns 422 when changing type to select without options', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ type: MedicalRecordFieldType.SELECT })
        .expect(422)
    })

    it('returns 403 when ADMIN tries to update', async () => {
      const { body: created } = await createField(platformAdminToken, generalField).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'X' })
        .expect(403)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-record-canonical-fields/${faker.string.uuid()}`)
        .send({ label: 'X' })
        .expect(401)
    })
  })
})
