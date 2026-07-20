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
import { ExamRequest } from '../entities/exam-request.entity'
import { ExamResult } from '../entities/exam-result.entity'

const SEED_CLINIC_ID = '30000000-0000-4000-8000-000000000099'
const SLUG = 'exams-clinic'

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

describe('ExamRequestsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Professional>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let examRequestRepository: Repository<ExamRequest>
  let examResultRepository: Repository<ExamResult>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let patientId: string
  let appointmentId: string
  let cancelledAppointmentId: string

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
    examRequestRepository = module.get(getRepositoryToken(ExamRequest))
    examResultRepository = module.get(getRepositoryToken(ExamResult))
  })

  beforeEach(async () => {
    await examResultRepository.query('DELETE FROM test.exam_results')
    await examRequestRepository.query('DELETE FROM test.exam_requests')
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
        name: 'Exams Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@exams.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@exams.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@exams.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@exams.test',
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
    doctorId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '22222', state: 'SP', isPrimary: true }] as any
    otherDoctorEntity.professionalSpecialties = ([specialty]).map((s: any) => ({ specialtyId: s.id, registryNumber: null })) as any
    await doctorRepository.save(otherDoctorEntity)

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@exams.test',
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

    adminToken = await loginAndExtractToken('admin@exams.test')
    doctorToken = await loginAndExtractToken('doctor@exams.test')
    otherDoctorToken = await loginAndExtractToken('other@exams.test')
    userToken = await loginAndExtractToken('user@exams.test')
  })

  afterAll(async () => {
    await examResultRepository.query('DELETE FROM test.exam_results')
    await examRequestRepository.query('DELETE FROM test.exam_requests')
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
    await app.close()
  })

  const validPayload = () => ({
    appointmentId,
    items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
    notes: 'Retornar com resultado em 7 dias',
  })

  describe('POST /exam-requests', () => {
    it('returns 201 with snapshot when DOCTOR requests exams', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
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
      expect(body.items[0].name).toBe('Hemograma completo')
      expect(body.items[0].observations).toBe('Jejum de 8 horas')
      expect(body.notes).toBe('Retornar com resultado em 7 dias')
      expect(body.status).toBe('requested')
      expect(body.issuedAt).toBeDefined()
    })

    it('returns 201 with multiple items', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({
          appointmentId,
          items: [
            { name: 'Hemograma completo' },
            { name: 'Glicemia em jejum' },
            { name: 'Raio-X de tórax', observations: 'Incidência PA e perfil' },
          ],
        })
        .expect(201)

      expect(body.items).toHaveLength(3)
      expect(body.items[2].observations).toBe('Incidência PA e perfil')
    })

    it('returns 403 when ADMIN tries to request exams', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${adminToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 403 when DOCTOR requests exams for another doctor appointment', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 403 when USER tries to request exams', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${userToken}`)
        .send(validPayload())
        .expect(403)
    })

    it('returns 422 when appointment is cancelled', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...validPayload(), appointmentId: cancelledAppointmentId })
        .expect(422)
    })

    it('returns 400 when items array is empty', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [] })
        .expect(400)
    })

    it('returns 400 when item has no name', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, items: [{ observations: 'Sem nome' }] })
        .expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...validPayload(), extraField: 'value' })
        .expect(400)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/exam-requests')
        .send(validPayload())
        .expect(401)
    })
  })

  describe('GET /exam-requests', () => {
    let examRequestId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = body.id
    })

    it('returns list for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(examRequestId)
    })

    it('returns list for DOCTOR on own appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
    })

    it('returns 403 when DOCTOR queries another doctor appointment', async () => {
      await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER queries exam requests', async () => {
      await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .expect(401)
    })

    it('returns empty array when no exam requests exist for appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId: faker.string.uuid() })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })
  })

  describe('GET /exam-requests/:id', () => {
    let examRequestId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = body.id
    })

    it('returns exam request for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(examRequestId)
    })

    it('returns exam request for DOCTOR on own exam request', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(examRequestId)
    })

    it('returns 403 when DOCTOR accesses another doctor exam request', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses exam request', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when exam request does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .expect(401)
    })
  })

  describe('DELETE /exam-requests/:id', () => {
    let examRequestId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = body.id
    })

    it('returns 204 when ADMIN deletes exam request', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 204 when DOCTOR deletes own exam request', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)
    })

    it('returns 403 when DOCTOR deletes another doctor exam request', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete exam request', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when exam request does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('invalidates cache after delete', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get('/exam-requests')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-requests/${examRequestId}`)
        .expect(401)
    })
  })

  describe('GET /exam-requests/:id/pdf', () => {
    let examRequestId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = body.id
    })

    it('returns 200 with PDF content-type for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
      expect(res.headers['content-disposition']).toContain(`pedido-exames-${examRequestId}.pdf`)
      expect(Buffer.from(res.body).slice(0, 4).toString('ascii')).toBe('%PDF')
    })

    it('returns 200 with PDF content-type for DOCTOR on own exam request', async () => {
      const res = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}/pdf`)
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

    it('returns 403 when DOCTOR accesses another doctor exam request PDF', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}/pdf`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses exam request PDF', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}/pdf`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when exam request does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${faker.string.uuid()}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}/pdf`)
        .expect(401)
    })
  })

  describe('POST /exam-requests/:id/results', () => {
    let examRequestId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = body.id
    })

    it('returns 201, persists results and moves status to completed (multipart with 2 files)', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .attach('files', Buffer.from('fake-image-bytes'), { filename: 'raio-x.jpg', contentType: 'image/jpeg' })
        .expect(201)

      expect(body.status).toBe('completed')
      expect(body.results).toHaveLength(2)
      expect(body.results.map((r: { fileName: string }) => r.fileName)).toEqual(
        expect.arrayContaining(['hemograma.pdf', 'raio-x.jpg']),
      )
    })

    it('returns 422 when file type is invalid', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .attach('files', Buffer.from('plain text'), { filename: 'notes.txt', contentType: 'text/plain' })
        .expect(422)
    })

    it('returns 422 when no file is sent', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(422)
    })

    it('returns 403 when ADMIN tries to attach a result', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${adminToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(403)
    })

    it('returns 403 when USER tries to attach a result', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${userToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(403)
    })

    it('returns 403 when DOCTOR is not the owner of the exam request', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(401)
    })
  })

  describe('DELETE /exam-results/:id', () => {
    let examRequestId: string
    let resultId: string

    beforeEach(async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = created.id

      const { body: withResult } = await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(201)
      resultId = withResult.results[0].id
    })

    it('returns 204 and reverts status to requested when removing the last result', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.status).toBe('requested')
      expect(body.results).toEqual([])
    })

    it('keeps status completed when other results remain', async () => {
      const { body: withSecondResult } = await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .attach('files', Buffer.from('fake-image-bytes'), { filename: 'raio-x.jpg', contentType: 'image/jpeg' })
        .expect(201)

      expect(withSecondResult.results).toHaveLength(2)

      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.status).toBe('completed')
      expect(body.results).toHaveLength(1)
    })

    it('returns 403 when ADMIN tries to remove a result', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to remove a result', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 403 when DOCTOR is not the owner of the exam request', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 404 when the exam result does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/exam-results/${resultId}`)
        .expect(401)
    })
  })

  describe('GET /exam-results/:id/file', () => {
    let examRequestId: string
    let resultId: string

    beforeEach(async () => {
      const { body: created } = await request(app.getHttpServer())
        .post('/exam-requests')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(validPayload())
        .expect(201)
      examRequestId = created.id

      const { body: withResult } = await request(app.getHttpServer())
        .post(`/exam-requests/${examRequestId}/results`)
        .set('Cookie', `access_token=${doctorToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'hemograma.pdf', contentType: 'application/pdf' })
        .expect(201)
      resultId = withResult.results[0].id
    })

    it('never exposes a fileUrl in the API response — the file is only reachable through this endpoint', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/exam-requests/${examRequestId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.results[0]).not.toHaveProperty('fileUrl')
      expect(body.results[0]).not.toHaveProperty('filePath')
    })

    it('returns 200 with the file bytes for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/exam-results/${resultId}/file`)
        .set('Cookie', `access_token=${adminToken}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
      expect(res.body.toString()).toBe('%PDF-fake')
    })

    it('returns 200 for DOCTOR who owns the exam request', async () => {
      await request(app.getHttpServer())
        .get(`/exam-results/${resultId}/file`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)
    })

    it('returns 403 when USER tries to download the file', async () => {
      await request(app.getHttpServer())
        .get(`/exam-results/${resultId}/file`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 403 when DOCTOR is not the owner of the exam request', async () => {
      await request(app.getHttpServer())
        .get(`/exam-results/${resultId}/file`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 404 when the exam result does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/exam-results/${faker.string.uuid()}/file`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/exam-results/${resultId}/file`)
        .expect(401)
    })
  })
})
