import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { CouncilType, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Professional } from '../../professionals/entities/professional.entity'
import { User } from '../../users/entities/user.entity'
import { Vaccine } from '../../vaccines/entities/vaccine.entity'
import { Vaccination } from '../entities/vaccination.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'
const PASSWORD = 'Password123!'

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

// A autenticação vai por Bearer, não por cookie: `cookieParser` só é aplicado
// em `main.ts`, que o teste não executa — a estratégia JWT aceita o header como
// segundo extrator.
describe('VaccinationsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let patientRepository: Repository<Patient>
  let professionalRepository: Repository<Professional>
  let vaccineRepository: Repository<Vaccine>
  let vaccinationRepository: Repository<Vaccination>

  let adminWithProfileToken: string
  let adminWithoutProfileToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let receptionistToken: string
  let patientId: string
  let vaccineId: string
  let inactiveVaccineId: string

  async function createUser(role: UserRole, prefix: string): Promise<User> {
    return userRepository.save(
      userRepository.create({
        fullName: `${prefix} User`,
        email: `${prefix}.${faker.string.alphanumeric(8)}@vaccinations.test`,
        password: await bcrypt.hash(PASSWORD, 1),
        role,
        clinicId: SEED_CLINIC_ID,
      }),
    )
  }

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD, slug: 'seed-clinic' })

    const raw = response.headers['set-cookie'] as unknown as string[] | string
    const cookies = Array.isArray(raw) ? raw : [raw]
    const match = cookies.find((c: string) => c?.startsWith('access_token_seed-clinic='))
    return match ? match.slice('access_token_seed-clinic='.length).split(';')[0] : ''
  }

  async function giveProfile(user: User, registration: string): Promise<Professional> {
    const professional = professionalRepository.create({
      userId: user.id,
      clinicId: SEED_CLINIC_ID,
    })
    professional.registrations = [
      { clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: registration, state: 'SP', isPrimary: true },
    ] as never
    return professionalRepository.save(professional)
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
    patientRepository = module.get(getRepositoryToken(Patient))
    professionalRepository = module.get(getRepositoryToken(Professional))
    vaccineRepository = module.get(getRepositoryToken(Vaccine))
    vaccinationRepository = module.get(getRepositoryToken(Vaccination))
  })

  beforeEach(async () => {
    await clinicRepository.save(
      clinicRepository.create({ id: SEED_CLINIC_ID, name: 'Seed Clinic', slug: 'seed-clinic', isActive: true }),
    )

    // A médica que administra a própria clínica: cargo ADMIN e ficha.
    const adminWithProfile = await createUser(UserRole.ADMIN, 'adminprof')
    await giveProfile(adminWithProfile, '11111')
    adminWithProfileToken = await login(adminWithProfile.email)

    const adminWithoutProfile = await createUser(UserRole.ADMIN, 'adminonly')
    adminWithoutProfileToken = await login(adminWithoutProfile.email)

    const doctor = await createUser(UserRole.PROFESSIONAL, 'doctor')
    await giveProfile(doctor, '22222')
    doctorToken = await login(doctor.email)

    const otherDoctor = await createUser(UserRole.PROFESSIONAL, 'otherdoctor')
    await giveProfile(otherDoctor, '33333')
    otherDoctorToken = await login(otherDoctor.email)

    const receptionist = await createUser(UserRole.USER, 'reception')
    receptionistToken = await login(receptionist.email)

    const patientUser = await createUser(UserRole.PATIENT, 'patient')
    const patient = await patientRepository.save(
      patientRepository.create({
        userId: patientUser.id,
        clinicId: SEED_CLINIC_ID,
        documentNumber: faker.string.numeric(11),
        phoneNumber: faker.string.numeric(11),
        birthDate: '1990-01-01',
        gender: PatientGender.FEMALE,
      }),
    )
    patientId = patient.id

    const vaccine = await vaccineRepository.save(
      vaccineRepository.create({ name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: 'sarampo', isActive: true }),
    )
    vaccineId = vaccine.id

    const inactive = await vaccineRepository.save(
      vaccineRepository.create({ name: 'Vacina descontinuada', abbreviation: null, preventedDiseases: null, isActive: false }),
    )
    inactiveVaccineId = inactive.id
  })

  afterEach(async () => {
    await vaccinationRepository.query('DELETE FROM test.vaccinations')
    await vaccineRepository.query('DELETE FROM test.vaccines')
    await patientRepository.query('DELETE FROM test.patients')
    await professionalRepository.query('DELETE FROM test.professional_registrations')
    await professionalRepository.query('DELETE FROM test.professionals')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
  })

  afterAll(async () => {
    await app.close()
  })

  const payload = (overrides = {}) => ({
    patientId,
    vaccineId,
    doseLabel: '1ª dose',
    appliedAt: '2019-04-12',
    appliedAtDescription: 'UBS Centro',
    ...overrides,
  })

  describe('POST /vaccinations', () => {
    // O caso mais comum da caderneta: dose tomada anos atrás, em outro serviço.
    it('records a dose with no appointment at all → 201', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      expect(body.appointmentId).toBeNull()
      expect(body.vaccineName).toBe('Tríplice viral')
      expect(body.vaccineAbbreviation).toBe('SCR')
      expect(body.doseLabel).toBe('1ª dose')
      expect(body.recordedByProfessionalName).toBe('doctor User')
    })

    // Exercer vem da ficha, não do cargo.
    it('lets an ADMIN who also practises record → 201', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${adminWithProfileToken}`)
        .send(payload())
        .expect(201)
    })

    it('returns 403 for an ADMIN with no professional profile', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${adminWithoutProfileToken}`)
        .send(payload())
        .expect(403)
    })

    it('returns 403 for a receptionist', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${receptionistToken}`)
        .send(payload())
        .expect(403)
    })

    it('returns 422 for a vaccine outside the catalogue', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload({ vaccineId: '00000000-0000-4000-8000-00000000dead' }))
        .expect(422)
    })

    it('returns 422 for an inactive vaccine', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload({ vaccineId: inactiveVaccineId }))
        .expect(422)
    })

    // A caderneta registra o que já foi aplicado.
    it('returns 422 for a dose dated in the future', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload({ appliedAt: tomorrow }))
        .expect(422)
    })

    it('returns 404 for a patient outside the clinic', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload({ patientId: '00000000-0000-4000-8000-00000000beef' }))
        .expect(404)
    })
  })

  describe('GET /vaccinations', () => {
    it('returns the booklet, most recent first', async () => {
      for (const [label, date] of [['1ª dose', '2019-04-12'], ['reforço', '2024-08-03']]) {
        await request(app.getHttpServer())
          .post('/vaccinations')
          .set('Authorization', `Bearer ${doctorToken}`)
          .send(payload({ doseLabel: label, appliedAt: date }))
          .expect(201)
      }

      const { body } = await request(app.getHttpServer())
        .get(`/vaccinations?patientId=${patientId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200)

      expect(body.total).toBe(2)
      expect(body.data[0].appliedAt).toBe('2024-08-03')
      expect(body.data[1].appliedAt).toBe('2019-04-12')
    })

    // Caderneta é dado clínico, na mesma linha do prontuário e das fotos.
    it('returns 403 for a receptionist', async () => {
      await request(app.getHttpServer())
        .get(`/vaccinations?patientId=${patientId}`)
        .set('Authorization', `Bearer ${receptionistToken}`)
        .expect(403)
    })

    // Um profissional vê a caderneta inteira: o histórico de imunização do
    // paciente não se fatia por quem transcreveu.
    it('shows a professional the doses another professional recorded', async () => {
      await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/vaccinations?patientId=${patientId}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .expect(200)

      expect(body.total).toBe(1)
    })

    it('returns 404 without a patient or an appointment', async () => {
      await request(app.getHttpServer())
        .get('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404)
    })
  })

  describe('PATCH /vaccinations/:id', () => {
    it('lets the professional correct their own record', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .patch(`/vaccinations/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ doseLabel: 'reforço' })
        .expect(200)

      expect(body.doseLabel).toBe('reforço')
    })

    // Corrigir a caderneta é zeladoria: o ADMIN sem ficha também corrige.
    it('lets an ADMIN with no profile correct any record', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/vaccinations/${created.id}`)
        .set('Authorization', `Bearer ${adminWithoutProfileToken}`)
        .send({ doseLabel: 'reforço' })
        .expect(200)
    })

    it('returns 403 for a professional on someone else record', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/vaccinations/${created.id}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .send({ doseLabel: 'reforço' })
        .expect(403)
    })
  })

  describe('DELETE /vaccinations/:id', () => {
    it('soft deletes the record → 204', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccinations/${created.id}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(204)

      const stored = await vaccinationRepository.findOne({ where: { id: created.id }, withDeleted: true })
      expect(stored?.deletedAt).not.toBeNull()
    })

    it('returns 403 for a professional on someone else record', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccinations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccinations/${created.id}`)
        .set('Authorization', `Bearer ${otherDoctorToken}`)
        .expect(403)
    })
  })
})
