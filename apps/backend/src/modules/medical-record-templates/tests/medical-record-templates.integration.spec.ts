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
import { ClinicSpecialty } from '../../clinic-specialties/entities/clinic-specialty.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../../users/entities/user.entity'
import { MedicalRecordCanonicalField } from '../../medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import { MedicalRecordTemplate } from '../entities/medical-record-template.entity'

const CLINIC_A_ID = '10000000-0000-4000-8000-000000000000'
const CLINIC_B_ID = '20000000-0000-4000-8000-000000000000'

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

describe('MedicalRecordTemplatesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let specialtyRepository: Repository<Specialty>
  let clinicSpecialtyRepository: Repository<ClinicSpecialty>
  let canonicalFieldRepository: Repository<MedicalRecordCanonicalField>
  let templateRepository: Repository<MedicalRecordTemplate>

  let adminToken: string
  let doctorToken: string
  let userToken: string
  let adminBToken: string
  let specialtyId: string

  async function loginAs(role: UserRole, clinicId: string, slug: string): Promise<string> {
    const password = 'Password123!'
    const hashedPassword = await bcrypt.hash(password, 1)
    const user = await userRepository.save(
      userRepository.create({
        fullName: `Test ${role}`,
        email: `${role}.${faker.string.alphanumeric(8)}@templates.test`,
        password: hashedPassword,
        role,
        clinicId,
      }),
    )

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password, slug })

    const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
    const prefix = `access_token_${slug}=`
    const match = cookies.find((c: string) => c?.startsWith(prefix))
    return match ? match.slice(prefix.length).split(';')[0] : ''
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
    clinicSpecialtyRepository = module.get(getRepositoryToken(ClinicSpecialty))
    canonicalFieldRepository = module.get(getRepositoryToken(MedicalRecordCanonicalField))
    templateRepository = module.get(getRepositoryToken(MedicalRecordTemplate))
  })

  beforeEach(async () => {
    await clinicRepository.save([
      clinicRepository.create({ id: CLINIC_A_ID, name: 'Clinic A', slug: 'clinic-a', isActive: true }),
      clinicRepository.create({ id: CLINIC_B_ID, name: 'Clinic B', slug: 'clinic-b', isActive: true }),
    ])

    const specialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Cardiologia' }))
    specialtyId = specialty.id
    await clinicSpecialtyRepository.save(
      clinicSpecialtyRepository.create({ clinicId: CLINIC_A_ID, specialtyId }),
    )

    adminToken = await loginAs(UserRole.ADMIN, CLINIC_A_ID, 'clinic-a')
    doctorToken = await loginAs(UserRole.DOCTOR, CLINIC_A_ID, 'clinic-a')
    userToken = await loginAs(UserRole.USER, CLINIC_A_ID, 'clinic-a')
    adminBToken = await loginAs(UserRole.ADMIN, CLINIC_B_ID, 'clinic-b')
  })

  afterEach(async () => {
    await templateRepository.query('DELETE FROM test.medical_record_templates')
    await canonicalFieldRepository.query('DELETE FROM test.medical_record_canonical_fields')
    await clinicSpecialtyRepository.query('DELETE FROM test.clinic_specialties')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await specialtyRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  function createTemplate(token: string, payload: object) {
    return request(app.getHttpServer())
      .post('/medical-record-templates')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
  }

  const freeFieldsPayload = () => ({
    specialtyId,
    name: 'Prontuário de Cardiologia',
    fields: [
      { label: 'Peso', type: MedicalRecordFieldType.NUMBER, required: true, order: 1, canonical: false },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, order: 2, canonical: false },
    ],
  })

  describe('POST /medical-record-templates', () => {
    it('returns 201 and generates immutable field keys, ignoring client-sent keys', async () => {
      const payload = freeFieldsPayload()
      ;(payload.fields[0] as any).key = 'hacked'

      const { body } = await createTemplate(adminToken, payload).expect(201)

      expect(body.id).toBeDefined()
      expect(body.specialtyName).toBe('Cardiologia')
      expect(body.fields[0].key).toMatch(/^peso_[a-z0-9]{4}$/)
      expect(body.fields[0].key).not.toBe('hacked')
      expect(body.fields[1].key).toMatch(/^observacoes_[a-z0-9]{4}$/)
    })

    it('returns 422 when specialty is not linked to the clinic', async () => {
      const other = await specialtyRepository.save(specialtyRepository.create({ name: 'Neurologia' }))

      await createTemplate(adminToken, { ...freeFieldsPayload(), specialtyId: other.id }).expect(422)
    })

    it('returns 409 when a template already exists for the specialty', async () => {
      await createTemplate(adminToken, freeFieldsPayload()).expect(201)
      await createTemplate(adminToken, freeFieldsPayload()).expect(409)
    })

    it('returns 201 for a generalist template (no specialtyId) without a clinic-specialty link', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      const { body } = await createTemplate(adminToken, {
        ...generalistPayload,
        name: 'Prontuário clínico geral',
      }).expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.specialtyName).toBeNull()
    })

    it('returns 409 when a generalist template already exists for the clinic', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      await createTemplate(adminToken, { ...generalistPayload, name: 'Clínico geral' }).expect(201)
      await createTemplate(adminToken, { ...generalistPayload, name: 'Outro clínico geral' }).expect(
        409,
      )
    })

    it('returns 422 when a select field has no options', async () => {
      await createTemplate(adminToken, {
        specialtyId,
        name: 'Template',
        fields: [{ label: 'Risco', type: MedicalRecordFieldType.SELECT, required: true, order: 1, canonical: false }],
      }).expect(422)
    })

    it('returns 201 for a canonical field that matches the catalog', async () => {
      await canonicalFieldRepository.save(
        canonicalFieldRepository.create({
          canonicalKey: 'allergies',
          label: 'Alergias',
          type: MedicalRecordFieldType.TEXTAREA,
          options: null,
          unit: null,
          specialtyId: null,
          description: null,
        }),
      )

      const { body } = await createTemplate(adminToken, {
        specialtyId,
        name: 'Template',
        fields: [
          {
            label: 'Alergias',
            type: MedicalRecordFieldType.TEXTAREA,
            required: false,
            order: 1,
            canonical: true,
            canonicalKey: 'allergies',
          },
        ],
      }).expect(201)

      expect(body.fields[0].canonical).toBe(true)
      expect(body.fields[0].canonicalKey).toBe('allergies')
    })

    it('returns 422 when a canonical field references an unknown canonicalKey', async () => {
      await createTemplate(adminToken, {
        specialtyId,
        name: 'Template',
        fields: [
          {
            label: 'Alergias',
            type: MedicalRecordFieldType.TEXTAREA,
            required: false,
            order: 1,
            canonical: true,
            canonicalKey: 'missing',
          },
        ],
      }).expect(422)
    })

    it('returns 403 when DOCTOR tries to create', async () => {
      await createTemplate(doctorToken, freeFieldsPayload()).expect(403)
    })

    it('returns 403 when USER tries to create', async () => {
      await createTemplate(userToken, freeFieldsPayload()).expect(403)
    })

    it('returns 401 when no token is provided', async () => {
      await request(app.getHttpServer())
        .post('/medical-record-templates')
        .send(freeFieldsPayload())
        .expect(401)
    })
  })

  describe('GET /medical-record-templates', () => {
    it('returns 200 for ADMIN scoped to the clinic', async () => {
      await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data[0].specialtyName).toBe('Cardiologia')
    })

    it('returns 200 for DOCTOR (read access)', async () => {
      await request(app.getHttpServer())
        .get('/medical-record-templates')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get('/medical-record-templates')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403)
    })

    it('does not list templates from another clinic', async () => {
      await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-templates')
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(200)

      expect(body.total).toBe(0)
    })

    it('returns only the generalist template when generalist=true', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()
      await createTemplate(adminToken, freeFieldsPayload()).expect(201)
      await createTemplate(adminToken, { ...generalistPayload, name: 'Clínico geral' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-templates?generalist=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data[0].specialtyId).toBeNull()
      expect(body.data[0].specialtyName).toBeNull()
    })

    it('allows a DOCTOR to fetch the generalist template', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()
      await createTemplate(adminToken, { ...generalistPayload, name: 'Clínico geral' }).expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-record-templates?generalist=true')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data[0].specialtyId).toBeNull()
    })
  })

  describe('GET /medical-record-templates/:id', () => {
    it('returns 404 when the template belongs to another clinic', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .get(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .expect(404)
    })

    it('returns 200 with the template for the owning clinic', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(body.id).toBe(created.id)
    })
  })

  describe('PATCH /medical-record-templates/:id', () => {
    it('preserves keys of existing fields and generates keys for new ones', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)
      const existingKey = created.fields[0].key

      const { body } = await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fields: [
            { ...created.fields[0] },
            { label: 'Altura', type: MedicalRecordFieldType.NUMBER, required: false, order: 3, canonical: false },
          ],
        })
        .expect(200)

      expect(body.fields[0].key).toBe(existingKey)
      expect(body.fields[1].key).toMatch(/^altura_[a-z0-9]{4}$/)
    })

    it('returns 403 when DOCTOR tries to update', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'New name' })
        .expect(403)
    })

    it('returns 404 for a template from another clinic', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ name: 'New name' })
        .expect(404)
    })
  })

  describe('DELETE /medical-record-templates/:id', () => {
    it('returns 204 and soft deletes the template', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .delete(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      const deleted = await templateRepository.findOne({
        where: { id: created.id },
        withDeleted: true,
      })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('allows creating a new template for the specialty after soft delete', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .delete(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204)

      await createTemplate(adminToken, freeFieldsPayload()).expect(201)
    })

    it('returns 403 when DOCTOR tries to delete', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .delete(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403)
    })
  })
})
