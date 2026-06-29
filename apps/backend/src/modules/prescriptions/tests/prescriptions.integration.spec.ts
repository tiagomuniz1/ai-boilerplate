import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, DayOfWeek, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { Medication } from '../../medications/entities/medication.entity'
import { Prescription } from '../entities/prescription.entity'

const SEED_CLINIC_ID = '20000000-0000-4000-8000-000000000099'
const SLUG = 'prescriptions-clinic'

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

describe('PrescriptionsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let medicationRepository: Repository<Medication>
  let prescriptionRepository: Repository<Prescription>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let otherDoctorId: string
  let patientId: string
  let appointmentId: string
  let cancelledAppointmentId: string
  let medicationId: string

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
    doctorRepository = module.get(getRepositoryToken(Doctor))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
    medicationRepository = module.get(getRepositoryToken(Medication))
    prescriptionRepository = module.get(getRepositoryToken(Prescription))
  })

  beforeEach(async () => {
    await prescriptionRepository.query('DELETE FROM test.prescriptions')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await medicationRepository.query('DELETE FROM test.medications')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Prescriptions Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@rx.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@rx.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@rx.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@rx.test',
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
      crmNumber: '11111/SP',
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.specialties = [specialty]
    const doctorProfile = await doctorRepository.save(doctorEntity)
    doctorId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      crmNumber: '22222/SP',
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.specialties = [specialty]
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@rx.test',
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
        doctorId,
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
        doctorId,
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
        doctorId,
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

    adminToken = await loginAndExtractToken('admin@rx.test')
    doctorToken = await loginAndExtractToken('doctor@rx.test')
    otherDoctorToken = await loginAndExtractToken('other@rx.test')
    userToken = await loginAndExtractToken('user@rx.test')
  })

  afterAll(async () => {
    await prescriptionRepository.query('DELETE FROM test.prescriptions')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await medicationRepository.query('DELETE FROM test.medications')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  const validPayload = () => ({
    appointmentId,
    items: [{ medicationId, instructions: 'Tomar 1 comprimido a cada 8 horas' }],
    notes: 'Retornar em 7 dias se necessário',
  })

  describe('POST /prescriptions', () => {
    it('returns 201 with snapshot when DOCTOR emits prescription', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.appointmentId).toBe(appointmentId)
      expect(body.patientId).toBe(patientId)
      expect(body.doctorId).toBe(doctorId)
      expect(body.patientName).toBe('Patient Jones')
      expect(body.doctorName).toBe('Doctor Smith')
      expect(body.items).toHaveLength(1)
      expect(body.items[0].name).toBe('Dipirona 500mg')
      expect(body.items[0].activeIngredient).toBe('dipirona sódica')
      expect(body.items[0].instructions).toBe('Tomar 1 comprimido a cada 8 horas')
      expect(body.notes).toBe('Retornar em 7 dias se necessário')
      expect(body.issuedAt).toBeDefined()
    })

    it('returns 201 with multiple items', async () => {
      const secondMed = await medicationRepository.save(
        medicationRepository.create({
          name: 'Paracetamol 750mg',
          activeIngredient: 'paracetamol',
          source: 'manual' as any,
          isActive: true,
          importHash: null,
        }),
      )

      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({
          appointmentId,
          items: [
            { medicationId, instructions: 'Tomar 1 cp a cada 8h' },
            { medicationId: secondMed.id, instructions: 'Tomar 1 cp a cada 6h' },
          ],
        })
        .expect(201)

      expect(body.items).toHaveLength(2)
    })

    it('returns 403 when ADMIN tries to emit prescription', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${adminToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 403 when DOCTOR emits for another doctor appointment', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 403 when USER tries to emit prescription', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${userToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 422 when appointment is cancelled', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...validPayload(), appointmentId: cancelledAppointmentId })
        .expect(422)
    })

    it('returns 422 when medicationId does not exist', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({
          appointmentId,
          items: [{ medicationId: faker.string.uuid(), instructions: 'Tomar 1 cp' }],
        })
        .expect(422)
    })

    it('returns 400 when items array is empty', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [] })
        .expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...validPayload(), extraField: 'value' })
        .expect(400)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/prescriptions')
        .send(validPayload())
        .expect(401)
    })
  })

  describe('GET /prescriptions', () => {
    let prescriptionId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      prescriptionId = body.id
    })

    it('returns list for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(prescriptionId)
    })

    it('returns list for DOCTOR on own appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
    })

    it('returns 403 when DOCTOR queries another doctor appointment', async () => {
      await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER queries prescriptions', async () => {
      await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .expect(401)
    })

    it('returns empty array when no prescriptions exist for appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId: faker.string.uuid() })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })
  })

  describe('GET /prescriptions/:id', () => {
    let prescriptionId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      prescriptionId = body.id
    })

    it('returns prescription for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(prescriptionId)
    })

    it('returns prescription for DOCTOR on own prescription', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(prescriptionId)
    })

    it('returns 403 when DOCTOR accesses another doctor prescription', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses prescription', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when prescription does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .expect(401)
    })
  })

  describe('DELETE /prescriptions/:id', () => {
    let prescriptionId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      prescriptionId = body.id
    })

    it('returns 204 when ADMIN deletes prescription', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 204 when DOCTOR deletes own prescription', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)
    })

    it('returns 403 when DOCTOR deletes another doctor prescription', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete prescription', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when prescription does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('invalidates cache after delete', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get('/prescriptions')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/prescriptions/${prescriptionId}`)
        .expect(401)
    })
  })

  describe('GET /prescriptions/:id/pdf', () => {
    let prescriptionId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/prescriptions')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      prescriptionId = body.id
    })

    it('returns 200 with PDF content-type for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
      expect(res.headers['content-disposition']).toContain(`receita-${prescriptionId}.pdf`)
      expect(Buffer.from(res.body).slice(0, 4).toString('ascii')).toBe('%PDF')
    })

    it('returns 200 with PDF content-type for DOCTOR on own prescription', async () => {
      const res = await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/pdf`)
        .set('Cookie', `access_token=${doctorToken}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
    })

    it('returns 403 when DOCTOR accesses another doctor prescription PDF', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/pdf`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses prescription PDF', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/pdf`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when prescription does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${faker.string.uuid()}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/prescriptions/${prescriptionId}/pdf`)
        .expect(401)
    })
  })
})
