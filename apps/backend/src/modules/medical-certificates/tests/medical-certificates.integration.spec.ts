import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, DayOfWeek, MedicalCertificateType, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { MedicalCertificate } from '../entities/medical-certificate.entity'

const SEED_CLINIC_ID = '20000000-0000-4000-8000-000000000098'
const SLUG = 'medical-certificates-clinic'

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

describe('MedicalCertificatesController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let medicalCertificateRepository: Repository<MedicalCertificate>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let otherDoctorId: string
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
    doctorRepository = module.get(getRepositoryToken(Doctor))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
    medicalCertificateRepository = module.get(getRepositoryToken(MedicalCertificate))
  })

  beforeEach(async () => {
    await medicalCertificateRepository.query('DELETE FROM test.medical_certificates')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Medical Certificates Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@cert.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@cert.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@cert.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@cert.test',
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
        email: 'patient@cert.test',
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

    adminToken = await loginAndExtractToken('admin@cert.test')
    doctorToken = await loginAndExtractToken('doctor@cert.test')
    otherDoctorToken = await loginAndExtractToken('other@cert.test')
    userToken = await loginAndExtractToken('user@cert.test')
  })

  afterAll(async () => {
    await medicalCertificateRepository.query('DELETE FROM test.medical_certificates')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await doctorRepository.query('DELETE FROM test.doctor_specialties')
    await doctorRepository.query('DELETE FROM test.doctors')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  const leavePayload = () => ({
    appointmentId,
    type: MedicalCertificateType.LEAVE,
    daysOff: 3,
    startDate: '2026-01-05',
    cidCode: 'M54.5',
    observations: 'Repouso absoluto',
  })

  const attendancePayload = () => ({
    appointmentId,
    type: MedicalCertificateType.ATTENDANCE,
    attendanceDate: '2026-01-05',
    checkInTime: '08:00',
    checkOutTime: '08:30',
  })

  describe('POST /medical-certificates', () => {
    it('returns 201 with snapshot when DOCTOR emits LEAVE certificate', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(leavePayload())
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.appointmentId).toBe(appointmentId)
      expect(body.patientId).toBe(patientId)
      expect(body.doctorId).toBe(doctorId)
      expect(body.patientName).toBe('Patient Jones')
      expect(body.doctorName).toBe('Doctor Smith')
      expect(body.type).toBe(MedicalCertificateType.LEAVE)
      expect(body.daysOff).toBe(3)
      expect(body.startDate).toBe('2026-01-05')
      expect(body.cidCode).toBe('M54.5')
      expect(body.attendanceDate).toBeNull()
      expect(body.observations).toBe('Repouso absoluto')
      expect(body.issuedAt).toBeDefined()
    })

    it('returns 201 with snapshot when DOCTOR emits ATTENDANCE certificate', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(attendancePayload())
        .expect(201)

      expect(body.type).toBe(MedicalCertificateType.ATTENDANCE)
      expect(body.attendanceDate).toBe('2026-01-05')
      expect(body.checkInTime).toBe('08:00')
      expect(body.checkOutTime).toBe('08:30')
      expect(body.daysOff).toBeNull()
      expect(body.startDate).toBeNull()
    })

    it('returns 403 when ADMIN tries to emit certificate', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${adminToken}`)
        .send(leavePayload())
        .expect(403)
    })

    it('returns 403 when DOCTOR emits for another doctor appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send(leavePayload())
        .expect(403)
    })

    it('returns 403 when USER tries to emit certificate', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${userToken}`)
        .send(leavePayload())
        .expect(403)
    })

    it('returns 422 when appointment is cancelled', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...leavePayload(), appointmentId: cancelledAppointmentId })
        .expect(422)
    })

    it('returns 400 when LEAVE payload is missing daysOff', async () => {
      const { daysOff, ...rest } = leavePayload()
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(rest)
        .expect(400)
    })

    it('returns 400 when ATTENDANCE payload has invalid checkInTime format', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...attendancePayload(), checkInTime: '25:99' })
        .expect(400)
    })

    it('returns 400 when unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ ...leavePayload(), extraField: 'value' })
        .expect(400)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/medical-certificates')
        .send(leavePayload())
        .expect(401)
    })
  })

  describe('GET /medical-certificates', () => {
    let certificateId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(leavePayload())
        .expect(201)
      certificateId = body.id
    })

    it('returns list for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(Array.isArray(body)).toBe(true)
      expect(body).toHaveLength(1)
      expect(body[0].id).toBe(certificateId)
    })

    it('returns list for DOCTOR on own appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
    })

    it('returns 403 when DOCTOR queries another doctor appointment', async () => {
      await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER queries certificates', async () => {
      await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .expect(401)
    })

    it('returns empty array when no certificates exist for appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId: faker.string.uuid() })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })
  })

  describe('GET /medical-certificates/:id', () => {
    let certificateId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(leavePayload())
        .expect(201)
      certificateId = body.id
    })

    it('returns certificate for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(certificateId)
    })

    it('returns certificate for DOCTOR on own certificate', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)

      expect(body.id).toBe(certificateId)
    })

    it('returns 403 when DOCTOR accesses another doctor certificate', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses certificate', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when certificate does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .expect(401)
    })
  })

  describe('DELETE /medical-certificates/:id', () => {
    let certificateId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(leavePayload())
        .expect(201)
      certificateId = body.id
    })

    it('returns 204 when ADMIN deletes certificate', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 204 when DOCTOR deletes own certificate', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(204)
    })

    it('returns 403 when DOCTOR deletes another doctor certificate', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to delete certificate', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when certificate does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('invalidates cache after delete', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get('/medical-certificates')
        .query({ appointmentId })
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toEqual([])
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-certificates/${certificateId}`)
        .expect(401)
    })
  })

  describe('GET /medical-certificates/:id/pdf', () => {
    let certificateId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(leavePayload())
        .expect(201)
      certificateId = body.id
    })

    it('returns 200 with PDF content-type for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
      expect(res.headers['content-disposition']).toContain(`atestado-${certificateId}.pdf`)
      expect(Buffer.from(res.body).slice(0, 4).toString('ascii')).toBe('%PDF')
    })

    it('returns 200 with PDF content-type for DOCTOR on own certificate', async () => {
      const res = await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}/pdf`)
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

    it('returns 200 with PDF content-type for ATTENDANCE certificate', async () => {
      const { body: attendanceCert } = await request(app.getHttpServer())
        .post('/medical-certificates')
        .set('Cookie', `access_token=${doctorToken}`)
        .send(attendancePayload())
        .expect(201)

      const res = await request(app.getHttpServer())
        .get(`/medical-certificates/${attendanceCert.id}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(res.headers['content-type']).toMatch(/application\/pdf/)
    })

    it('returns 403 when DOCTOR accesses another doctor certificate PDF', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}/pdf`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })

    it('returns 403 when USER accesses certificate PDF', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}/pdf`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when certificate does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${faker.string.uuid()}/pdf`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/medical-certificates/${certificateId}/pdf`)
        .expect(401)
    })
  })
})
