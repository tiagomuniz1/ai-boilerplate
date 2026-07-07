import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Medication } from '../../medications/entities/medication.entity'
import { PrescriptionTemplate } from '../entities/prescription-template.entity'

const SEED_CLINIC_ID = '21000000-0000-4000-8000-000000000099'
const SLUG = 'prescription-templates-clinic'

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

describe('PrescriptionTemplatesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let medicationRepository: Repository<Medication>
  let templateRepository: Repository<PrescriptionTemplate>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let otherDoctorId: string
  let medicationId: string

  const password = 'Password123!'

  const cleanAll = async () => {
    await templateRepository.query('DELETE FROM test.prescription_templates')
    await medicationRepository.query('DELETE FROM test.medications')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
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

    userRepository = module.get(getRepositoryToken(User))
    clinicRepository = module.get(getRepositoryToken(Clinic))
    doctorRepository = module.get(getRepositoryToken(Doctor))
    medicationRepository = module.get(getRepositoryToken(Medication))
    templateRepository = module.get(getRepositoryToken(PrescriptionTemplate))
  })

  beforeEach(async () => {
    await cleanAll()

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Templates Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@tpl.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@tpl.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@tpl.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@tpl.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.crms = [{ clinicId: SEED_CLINIC_ID, number: '11111', state: 'SP', isPrimary: true }] as any
    const savedDoctor = await doctorRepository.save(doctorEntity)
    doctorId = savedDoctor.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.crms = [{ clinicId: SEED_CLINIC_ID, number: '22222', state: 'SP', isPrimary: true }] as any
    const savedOther = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = savedOther.id

    const medication = await medicationRepository.save(
      medicationRepository.create({
        name: 'Dipirona 500mg',
        activeIngredient: 'dipirona sódica',
        source: 'manual' as any,
        isActive: true,
        importHash: null,
      }),
    )
    medicationId = medication.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: SLUG })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith(`access_token_${SLUG}=`))
      return match ? match.slice(`access_token_${SLUG}=`.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@tpl.test')
    doctorToken = await loginAndExtractToken('doctor@tpl.test')
    otherDoctorToken = await loginAndExtractToken('other@tpl.test')
    userToken = await loginAndExtractToken('user@tpl.test')
  })

  afterAll(async () => {
    await cleanAll()
    await app.close()
  })

  const makePayload = (overrides = {}) => ({
    name: 'Hipertensão leve',
    items: [{ medicationId, instructions: 'Tomar 1 cp 8/8h' }],
    ...overrides,
  })

  describe('POST /prescription-templates', () => {
    it('creates template as DOCTOR → 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${doctorToken}`])
        .send(makePayload())
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.name).toBe('Hipertensão leve')
      expect(body.doctorId).toBe(doctorId)
      expect(body.doctorName).toBe('Doctor Smith')
      expect(body.items[0].name).toBe('Dipirona 500mg')
      expect(body.items[0].activeIngredient).toBe('dipirona sódica')
    })

    it('creates template as ADMIN with doctorId → 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send(makePayload({ doctorId }))
        .expect(201)

      expect(body.doctorId).toBe(doctorId)
    })

    it('creates template with activeIngredientName → 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${doctorToken}`])
        .send({ name: 'Manual', items: [{ activeIngredientName: 'Amoxicilina', instructions: 'Tomar 1 cp 8/8h' }] })
        .expect(201)

      expect(body.items[0].medicationId).toBeNull()
      expect(body.items[0].name).toBe('Amoxicilina')
    })

    it('returns 422 when ADMIN omits doctorId', async () => {
      await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send(makePayload())
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${userToken}`])
        .send(makePayload())
        .expect(403)
    })

    it('returns 400 when items array is empty', async () => {
      await request(app.getHttpServer())
        .post('/prescription-templates')
        .set('Cookie', [`access_token=${doctorToken}`])
        .send({ name: 'X', items: [] })
        .expect(400)
    })
  })

  describe('GET /prescription-templates', () => {
    beforeEach(async () => {
      await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          doctorName: 'Doctor Smith',
          name: 'Modelo A',
          items: [{ medicationId, name: 'Dipirona 500mg', activeIngredient: 'dipirona sódica', dosage: null, quantity: null, instructions: 'Tomar 1 cp' }],
          notes: null,
          isActive: true,
        }),
      )
    })

    it('DOCTOR sees only own templates → 200', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescription-templates')
        .set('Cookie', [`access_token=${doctorToken}`])
        .expect(200)

      expect(body).toHaveLength(1)
      expect(body[0].doctorId).toBe(doctorId)
    })

    it('ADMIN sees all templates → 200', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescription-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200)

      expect(body).toHaveLength(1)
    })

    it('otherDoctor sees no templates → 200 empty', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescription-templates')
        .set('Cookie', [`access_token=${otherDoctorToken}`])
        .expect(200)

      expect(body).toHaveLength(0)
    })

    it('returns 403 for USER role', async () => {
      await request(app.getHttpServer())
        .get('/prescription-templates')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(403)
    })
  })

  describe('GET /prescription-templates/:id', () => {
    let templateId: string

    beforeEach(async () => {
      const tpl = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          doctorName: 'Doctor Smith',
          name: 'Modelo A',
          items: [],
          notes: null,
          isActive: true,
        }),
      )
      templateId = tpl.id
    })

    it('DOCTOR retrieves own template → 200', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${doctorToken}`])
        .expect(200)

      expect(body.id).toBe(templateId)
    })

    it('ADMIN retrieves any template → 200', async () => {
      await request(app.getHttpServer())
        .get(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200)
    })

    it('otherDoctor returns 403', async () => {
      await request(app.getHttpServer())
        .get(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${otherDoctorToken}`])
        .expect(403)
    })

    it('returns 404 when template not found', async () => {
      await request(app.getHttpServer())
        .get('/prescription-templates/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404)
    })
  })

  describe('PATCH /prescription-templates/:id', () => {
    let templateId: string

    beforeEach(async () => {
      const tpl = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          doctorName: 'Doctor Smith',
          name: 'Modelo A',
          items: [],
          notes: null,
          isActive: true,
        }),
      )
      templateId = tpl.id
    })

    it('DOCTOR updates own template name → 200', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${doctorToken}`])
        .send({ name: 'Modelo Renomeado' })
        .expect(200)

      expect(body.name).toBe('Modelo Renomeado')
    })

    it('otherDoctor returns 403', async () => {
      await request(app.getHttpServer())
        .patch(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${otherDoctorToken}`])
        .send({ name: 'Hack' })
        .expect(403)
    })

    it('ADMIN deactivates template → 200', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ isActive: false })
        .expect(200)

      expect(body.isActive).toBe(false)
    })

    it('returns 404 when template not found', async () => {
      await request(app.getHttpServer())
        .patch('/prescription-templates/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ name: 'X' })
        .expect(404)
    })
  })

  describe('DELETE /prescription-templates/:id', () => {
    let templateId: string

    beforeEach(async () => {
      const tpl = await templateRepository.save(
        templateRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          doctorName: 'Doctor Smith',
          name: 'Modelo A',
          items: [],
          notes: null,
          isActive: true,
        }),
      )
      templateId = tpl.id
    })

    it('DOCTOR deletes own template → 204', async () => {
      await request(app.getHttpServer())
        .delete(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${doctorToken}`])
        .expect(204)

      const inDb = await templateRepository.findOne({ where: { id: templateId } })
      expect(inDb).toBeNull()
    })

    it('ADMIN deletes any template → 204', async () => {
      await request(app.getHttpServer())
        .delete(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(204)
    })

    it('otherDoctor returns 403', async () => {
      await request(app.getHttpServer())
        .delete(`/prescription-templates/${templateId}`)
        .set('Cookie', [`access_token=${otherDoctorToken}`])
        .expect(403)
    })

    it('returns 404 when template not found', async () => {
      await request(app.getHttpServer())
        .delete('/prescription-templates/00000000-0000-0000-0000-000000000000')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(404)
    })
  })
})
