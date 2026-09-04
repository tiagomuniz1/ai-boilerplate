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
import { Appointment } from '../../appointments/entities/appointment.entity'
import { Vaccine } from '../../vaccines/entities/vaccine.entity'
import { VaccineIndication } from '../entities/vaccine-indication.entity'

const SEED_CLINIC_ID = '20000000-0000-4000-8000-000000000097'
const SLUG = 'vaccine-indications-clinic'

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

describe('VaccineIndicationsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Professional>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let vaccineIndicationRepository: Repository<VaccineIndication>
  let vaccineRepository: Repository<Vaccine>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let professionalId: string
  let otherDoctorId: string
  let patientId: string
  let appointmentId: string
  let cancelledAppointmentId: string
  let vaccineId: string
  let inactiveVaccineId: string

  const password = 'Password123!'

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
    vaccineIndicationRepository = module.get(getRepositoryToken(VaccineIndication))
    vaccineRepository = module.get(getRepositoryToken(Vaccine))
  })

  beforeEach(async () => {
    await vaccineIndicationRepository.query('DELETE FROM test.vaccine_indications')
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
        name: 'Vaccine Indications Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@indication.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@indication.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@indication.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@indication.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Clínica Geral' }),
    )

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '11111', state: 'SP', isPrimary: true }] as any
    doctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const doctorProfile = await doctorRepository.save(doctorEntity)
    professionalId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '22222', state: 'SP', isPrimary: true }] as any
    otherDoctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@indication.test',
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
        gender: PatientGender.FEMALE,
      }),
    )
    patientId = patientRecord.id

    const schedule = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '12:00',
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
        specialtyId: specialty.id,
        scheduleId: schedule.id,
        date: '2026-01-05',
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.SCHEDULED,
        reason: null,
        cancellationReason: null,
      }),
    )
    appointmentId = appointment.id

    const cancelledAppt = await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId,
        patientId,
        specialtyId: specialty.id,
        scheduleId: schedule.id,
        date: '2026-01-06',
        startTime: '08:30',
        endTime: '09:00',
        status: AppointmentStatus.CANCELLED,
        reason: null,
        cancellationReason: 'Patient cancelled',
      }),
    )
    cancelledAppointmentId = cancelledAppt.id

    await vaccineRepository.query('DELETE FROM test.vaccines')
    const vaccine = await vaccineRepository.save(
      vaccineRepository.create({
        name: 'Tríplice viral',
        abbreviation: 'SCR',
        preventedDiseases: 'sarampo, caxumba, rubéola',
        isActive: true,
      }),
    )
    vaccineId = vaccine.id

    const inactiveVaccine = await vaccineRepository.save(
      vaccineRepository.create({ name: 'Vacina fora de uso', abbreviation: null, preventedDiseases: null, isActive: false }),
    )
    inactiveVaccineId = inactiveVaccine.id

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

    adminToken = await loginAndExtractToken('admin@indication.test')
    doctorToken = await loginAndExtractToken('doctor@indication.test')
    otherDoctorToken = await loginAndExtractToken('other@indication.test')
    userToken = await loginAndExtractToken('user@indication.test')
  })

  afterAll(async () => {
    await vaccineIndicationRepository.query('DELETE FROM test.vaccine_indications')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.professional_specialties')
    await doctorRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await vaccineRepository.query('DELETE FROM test.vaccines')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  const payload = () => ({
    appointmentId,
    items: [{ vaccineId, doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' }],
    notes: 'Retorno em 30 dias.',
  })

  describe('POST /vaccine-indications', () => {
    it('201 e congela o nome da vacina e a assinatura', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.appointmentId).toBe(appointmentId)
      expect(body.patientId).toBe(patientId)
      expect(body.professionalId).toBe(professionalId)
      expect(body.patientName).toBe('Patient Jones')
      expect(body.professionalName).toBe('Doctor Smith')
      expect(body.items).toEqual([
        { vaccineId, name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: 'Aplicar em serviço de imunização' },
      ])
      expect(body.notes).toBe('Retorno em 30 dias.')
    })

    // O documento é fotografia do momento: renomear a vacina no catálogo depois
    // não pode reescrever o que já foi entregue à paciente.
    it('o documento emitido não muda quando a vacina é renomeada no catálogo', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      await vaccineRepository.update(vaccineId, { name: 'Nome novo do catálogo' })

      const { body: read } = await request(app.getHttpServer())
        .get(`/vaccine-indications/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(read.items[0].name).toBe('Tríplice viral')
    })

    it('422 quando a vacina está desativada no catálogo', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [{ vaccineId: inactiveVaccineId }] })
        .expect(422)
    })

    it('422 quando a vacina não existe', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [{ vaccineId: faker.string.uuid() }] })
        .expect(422)
    })

    it('422 em consulta cancelada', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId: cancelledAppointmentId, items: [{ vaccineId }] })
        .expect(422)
    })

    it('404 quando a consulta não existe', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId: faker.string.uuid(), items: [{ vaccineId }] })
        .expect(404)
    })

    it('400 sem nenhum item', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [] })
        .expect(400)
    })

    // Sempre do catálogo: nome livre quebraria a ligação com a caderneta.
    it('400 quando o item vem com nome livre em vez de vaccineId', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [{ vaccineName: 'Alguma vacina' }] })
        .expect(400)
    })

    // ADMIN sem ficha administra, mas não exerce.
    it('403 para ADMIN sem ficha de profissional', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${adminToken}`)
        .send(payload())
        .expect(403)
    })

    it('403 para profissional que não é o da consulta', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(payload())
        .expect(403)
    })

    it('403 para recepcionista', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${userToken}`)
        .send(payload())
        .expect(403)
    })

    it('401 sem autenticação', async () => {
      await request(app.getHttpServer()).post('/vaccine-indications').send(payload()).expect(401)
    })
  })

  describe('GET /vaccine-indications', () => {
    it('lista as da consulta', async () => {
      await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/vaccine-indications?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
      expect(body[0].items[0].name).toBe('Tríplice viral')
    })

    it('403 para profissional que não é o da consulta', async () => {
      await request(app.getHttpServer())
        .get(`/vaccine-indications?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('ADMIN sem ficha lê os documentos da clínica', async () => {
      await request(app.getHttpServer())
        .get(`/vaccine-indications?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)
    })

    it('400 sem appointmentId', async () => {
      await request(app.getHttpServer())
        .get('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(400)
    })
  })

  describe('GET /vaccine-indications/:id/pdf', () => {
    it('devolve um PDF', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      const response = await request(app.getHttpServer())
        .get(`/vaccine-indications/${created.id}/pdf`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)
        .buffer()
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })

      expect(response.headers['content-type']).toBe('application/pdf')
      expect((response.body as Buffer).slice(0, 4).toString('ascii')).toBe('%PDF')
    })

    it('403 para profissional que não emitiu', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .get(`/vaccine-indications/${created.id}/pdf`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })
  })

  describe('DELETE /vaccine-indications/:id', () => {
    it('204 e soft delete', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccine-indications/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/vaccine-indications/${created.id}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)

      const raw = await vaccineIndicationRepository.query(
        'SELECT deleted_at FROM test.vaccine_indications WHERE id = $1',
        [created.id],
      )
      expect(raw[0].deleted_at).not.toBeNull()
    })

    it('403 para profissional que não emitiu', async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/vaccine-indications')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(payload())
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/vaccine-indications/${created.id}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('404 quando não existe', async () => {
      await request(app.getHttpServer())
        .delete(`/vaccine-indications/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)
    })
  })
})
