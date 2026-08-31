import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { CouncilType, MedicalRecordFieldType, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { ClinicSpecialty } from '../../clinic-specialties/entities/clinic-specialty.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { User } from '../../users/entities/user.entity'
import { Professional } from '../../professionals/entities/professional.entity'
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
  let professionalRepository: Repository<Professional>

  let adminToken: string
  let doctorToken: string
  let userToken: string
  let adminBToken: string
  // CRM professional registered in `specialtyId` — the happy path for "create through own specialty".
  let crmWithSpecialtyToken: string
  // CRM professional registered in a different specialty — used to assert ownership is enforced.
  let crmOtherSpecialtyToken: string
  // Non-CRM professional (no specialties at all) — the happy path for "create direct for profession".
  let crnToken: string
  let specialtyId: string
  let otherSpecialtyId: string

  async function loginAs(
    role: UserRole,
    clinicId: string,
    slug: string,
  ): Promise<{ token: string; userId: string }> {
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
    return { token: match ? match.slice(prefix.length).split(';')[0] : '', userId: user.id }
  }

  async function createProfessional(
    userId: string,
    clinicId: string,
    councilType: CouncilType,
    specialtyIds: string[],
  ) {
    const entity = professionalRepository.create({ userId, clinicId })
    entity.registrations = [
      { clinicId, councilType, number: faker.string.numeric(5), state: 'SP', isPrimary: true },
    ] as any
    entity.professionalSpecialties = specialtyIds.map((id) => ({ specialtyId: id, registryNumber: null })) as any
    return professionalRepository.save(entity)
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
    professionalRepository = module.get(getRepositoryToken(Professional))
  })

  beforeEach(async () => {
    await clinicRepository.save([
      clinicRepository.create({ id: CLINIC_A_ID, name: 'Clinic A', slug: 'clinic-a', isActive: true }),
      clinicRepository.create({ id: CLINIC_B_ID, name: 'Clinic B', slug: 'clinic-b', isActive: true }),
    ])

    const specialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Cardiologia' }))
    specialtyId = specialty.id
    const otherSpecialty = await specialtyRepository.save(specialtyRepository.create({ name: 'Dermatologia' }))
    otherSpecialtyId = otherSpecialty.id
    await clinicSpecialtyRepository.save([
      clinicSpecialtyRepository.create({ clinicId: CLINIC_A_ID, specialtyId }),
      clinicSpecialtyRepository.create({ clinicId: CLINIC_A_ID, specialtyId: otherSpecialtyId }),
    ])

    adminToken = (await loginAs(UserRole.ADMIN, CLINIC_A_ID, 'clinic-a')).token
    ;({ token: doctorToken } = await loginAs(UserRole.PROFESSIONAL, CLINIC_A_ID, 'clinic-a'))
    userToken = (await loginAs(UserRole.USER, CLINIC_A_ID, 'clinic-a')).token
    adminBToken = (await loginAs(UserRole.ADMIN, CLINIC_B_ID, 'clinic-b')).token

    const crmWithSpecialty = await loginAs(UserRole.PROFESSIONAL, CLINIC_A_ID, 'clinic-a')
    crmWithSpecialtyToken = crmWithSpecialty.token
    await createProfessional(crmWithSpecialty.userId, CLINIC_A_ID, CouncilType.CRM, [specialtyId])

    const crmOtherSpecialty = await loginAs(UserRole.PROFESSIONAL, CLINIC_A_ID, 'clinic-a')
    crmOtherSpecialtyToken = crmOtherSpecialty.token
    await createProfessional(crmOtherSpecialty.userId, CLINIC_A_ID, CouncilType.CRM, [otherSpecialtyId])

    const crn = await loginAs(UserRole.PROFESSIONAL, CLINIC_A_ID, 'clinic-a')
    crnToken = crn.token
    await createProfessional(crn.userId, CLINIC_A_ID, CouncilType.CRN, [])
  })

  afterEach(async () => {
    await templateRepository.query('DELETE FROM test.medical_record_templates')
    await canonicalFieldRepository.query('DELETE FROM test.medical_record_canonical_fields')
    await professionalRepository.query('DELETE FROM test.professional_specialties')
    await professionalRepository.query('DELETE FROM test.professional_registrations')
    await professionalRepository.query('DELETE FROM test.professionals')
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

    it('returns 404 when a PROFESSIONAL user has no professional profile', async () => {
      await createTemplate(doctorToken, freeFieldsPayload()).expect(404)
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

    it('CRM professional creates a template for their own specialty', async () => {
      const { body } = await createTemplate(crmWithSpecialtyToken, freeFieldsPayload()).expect(201)

      expect(body.specialtyId).toBe(specialtyId)
      expect(body.specialtyName).toBe('Cardiologia')
      expect(body.councilType).toBeNull()
    })

    it('returns 403 when a CRM professional creates a template for a specialty that is not their own', async () => {
      await createTemplate(crmWithSpecialtyToken, { ...freeFieldsPayload(), specialtyId: otherSpecialtyId }).expect(
        403,
      )
    })

    it('CRM professional without a specialtyId targets the clinic CRM-generalist template', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      const { body } = await createTemplate(crmWithSpecialtyToken, {
        ...generalistPayload,
        name: 'Prontuário geral',
      }).expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.councilType).toBe(CouncilType.CRM)
    })

    it('non-CRM professional creates a template scoped to their own profession', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      const { body } = await createTemplate(crnToken, {
        ...generalistPayload,
        name: 'Prontuário de Nutrição',
      }).expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.councilType).toBe(CouncilType.CRN)
    })

    it('returns 422 when a non-CRM professional provides a specialtyId', async () => {
      await createTemplate(crnToken, freeFieldsPayload()).expect(422)
    })

    it('returns 409 when the non-CRM professional-scoped template already exists', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      await createTemplate(crnToken, { ...generalistPayload, name: 'Nutrição 1' }).expect(201)
      await createTemplate(crnToken, { ...generalistPayload, name: 'Nutrição 2' }).expect(409)
    })

    it('ADMIN creates a profession-scoped template by providing councilType explicitly', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()

      const { body } = await createTemplate(adminToken, {
        ...generalistPayload,
        name: 'Prontuário de Fisioterapia',
        councilType: CouncilType.CREFITO,
      }).expect(201)

      expect(body.specialtyId).toBeNull()
      expect(body.councilType).toBe(CouncilType.CREFITO)
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

    it('returns 404 when a PROFESSIONAL user has no professional profile', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ name: 'New name' })
        .expect(404)
    })

    it('returns 404 for a template from another clinic', async () => {
      const { body: created } = await createTemplate(adminToken, freeFieldsPayload()).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${adminBToken}`)
        .send({ name: 'New name' })
        .expect(404)
    })

    it('CRM professional updates a template for their own specialty', async () => {
      const { body: created } = await createTemplate(crmWithSpecialtyToken, freeFieldsPayload()).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${crmWithSpecialtyToken}`)
        .send({ name: 'Novo nome' })
        .expect(200)

      expect(body.name).toBe('Novo nome')
    })

    it('returns 403 when a CRM professional updates a template outside their own specialty', async () => {
      const { body: created } = await createTemplate(adminToken, {
        ...freeFieldsPayload(),
        specialtyId: otherSpecialtyId,
      }).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${crmWithSpecialtyToken}`)
        .send({ name: 'Novo nome' })
        .expect(403)
    })

    it('non-CRM professional updates their own profession-wide template', async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()
      const { body: created } = await createTemplate(crnToken, {
        ...generalistPayload,
        name: 'Prontuário de Nutrição',
      }).expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${crnToken}`)
        .send({ name: 'Novo nome' })
        .expect(200)

      expect(body.name).toBe('Novo nome')
    })

    it("returns 403 when a professional updates another profession's template", async () => {
      const { specialtyId: _omit, ...generalistPayload } = freeFieldsPayload()
      const { body: created } = await createTemplate(adminToken, {
        ...generalistPayload,
        name: 'Prontuário de Fisioterapia',
        councilType: CouncilType.CREFITO,
      }).expect(201)

      await request(app.getHttpServer())
        .patch(`/medical-record-templates/${created.id}`)
        .set('Authorization', `Bearer ${crnToken}`)
        .send({ name: 'Novo nome' })
        .expect(403)
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
