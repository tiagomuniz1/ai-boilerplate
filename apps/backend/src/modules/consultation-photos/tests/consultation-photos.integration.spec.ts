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
import { ConsultationPhoto } from '../entities/consultation-photo.entity'

const SEED_CLINIC_ID = '30000000-0000-4000-8000-000000000098'
const SLUG = 'consultation-photos-clinic'

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

describe('ConsultationPhotosController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let professionalRepository: Repository<Professional>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let consultationPhotoRepository: Repository<ConsultationPhoto>

  let adminToken: string
  let adminProfessionalToken: string
  let professionalToken: string
  let otherProfessionalToken: string
  let userToken: string
  let professionalId: string
  let adminProfessionalId: string
  let adminProfessionalAppointmentId: string
  let otherProfessionalId: string
  let patientId: string
  let appointmentId: string
  let otherAppointmentId: string

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
    professionalRepository = module.get(getRepositoryToken(Professional))
    patientRepository = module.get(getRepositoryToken(Patient))
    specialtyRepository = module.get(getRepositoryToken(Specialty))
    scheduleRepository = module.get(getRepositoryToken(Schedule))
    appointmentRepository = module.get(getRepositoryToken(Appointment))
    consultationPhotoRepository = module.get(getRepositoryToken(ConsultationPhoto))
  })

  beforeEach(async () => {
    await consultationPhotoRepository.query('DELETE FROM test.consultation_photos')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await professionalRepository.query('DELETE FROM test.professional_specialties')
    await professionalRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')

    await clinicRepository.save(
      clinicRepository.create({
        id: SEED_CLINIC_ID,
        name: 'Consultation Photos Clinic',
        slug: SLUG,
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@photos.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    // ADMIN que também atende: administra a clínica e tem ficha de profissional.
    const adminProfessionalUser = await userRepository.save(
      userRepository.create({
        fullName: 'Admin Professional',
        email: 'adminpro@photos.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const professionalUser = await userRepository.save(
      userRepository.create({
        fullName: 'Ana Nutri',
        email: 'professional@photos.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherProfessionalUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Professional',
        email: 'other@photos.test',
        password: hashed,
        role: UserRole.PROFESSIONAL,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@photos.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Nutrição Clínica' }),
    )

    const professionalEntity = professionalRepository.create({
      userId: professionalUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    professionalEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRN, number: '11111', state: 'SP', isPrimary: true }] as any
    professionalEntity.professionalSpecialties = [] as any
    const professionalProfile = await professionalRepository.save(professionalEntity)
    professionalId = professionalProfile.id

    const adminProfessionalEntity = professionalRepository.create({
      userId: adminProfessionalUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    adminProfessionalEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRN, number: '33333', state: 'SP', isPrimary: true }] as any
    adminProfessionalEntity.professionalSpecialties = [] as any
    const adminProfessionalProfile = await professionalRepository.save(adminProfessionalEntity)
    adminProfessionalId = adminProfessionalProfile.id

    const otherProfessionalEntity = professionalRepository.create({
      userId: otherProfessionalUser.id,
      clinicId: SEED_CLINIC_ID,
    })
    otherProfessionalEntity.registrations = [{ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRN, number: '22222', state: 'SP', isPrimary: true }] as any
    otherProfessionalEntity.professionalSpecialties = [] as any
    const otherProfessionalProfile = await professionalRepository.save(otherProfessionalEntity)
    otherProfessionalId = otherProfessionalProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@photos.test',
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

    const adminProfessionalAppointment = await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId: adminProfessionalId,
        patientId,
        specialtyId: null,
        scheduleId: schedule.id,
        date: '2026-01-05',
        startTime: '09:00',
        endTime: '09:30',
        status: AppointmentStatus.SCHEDULED,
        reason: null,
        cancellationReason: null,
      }),
    )
    adminProfessionalAppointmentId = adminProfessionalAppointment.id

    const otherSchedule = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId: otherProfessionalId,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.TUESDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )

    const otherAppointment = await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        professionalId: otherProfessionalId,
        patientId,
        specialtyId: specialty.id,
        scheduleId: otherSchedule.id,
        date: '2026-01-06',
        startTime: '08:00',
        endTime: '08:30',
        status: AppointmentStatus.SCHEDULED,
        reason: null,
        cancellationReason: null,
      }),
    )
    otherAppointmentId = otherAppointment.id

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

    adminToken = await loginAndExtractToken('admin@photos.test')
    adminProfessionalToken = await loginAndExtractToken('adminpro@photos.test')
    professionalToken = await loginAndExtractToken('professional@photos.test')
    otherProfessionalToken = await loginAndExtractToken('other@photos.test')
    userToken = await loginAndExtractToken('user@photos.test')
  })

  afterAll(async () => {
    await consultationPhotoRepository.query('DELETE FROM test.consultation_photos')
    await appointmentRepository.query('DELETE FROM test.appointments')
    await scheduleRepository.query('DELETE FROM test.schedule_exceptions')
    await scheduleRepository.query('DELETE FROM test.schedules')
    await patientRepository.query('DELETE FROM test.patients')
    await professionalRepository.query('DELETE FROM test.professional_specialties')
    await professionalRepository.query('DELETE FROM test.professionals')
    await specialtyRepository.query('DELETE FROM test.specialties')
    await userRepository.query('DELETE FROM test.refresh_tokens')
    await userRepository.query('DELETE FROM test.users')
    await clinicRepository.query('DELETE FROM test.clinics')
    await app.close()
  })

  describe('POST /consultation-photos/appointments/:appointmentId', () => {
    it('returns 201 and persists photos (multipart with 2 files)', async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao1.jpg', contentType: 'image/jpeg' })
        .attach('files', Buffer.from('fake-png-bytes'), { filename: 'evolucao2.png', contentType: 'image/png' })
        .expect(201)

      expect(body).toHaveLength(2)
      expect(body.map((p: { fileName: string }) => p.fileName)).toEqual(
        expect.arrayContaining(['evolucao1.jpg', 'evolucao2.png']),
      )
      expect(body[0]).not.toHaveProperty('filePath')
    })

    it('returns 422 when file type is invalid (e.g. pdf)', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('%PDF-fake'), { filename: 'doc.pdf', contentType: 'application/pdf' })
        .expect(422)
    })

    it('returns 422 when no file is sent', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(422)
    })

    it('returns 403 when ADMIN without a professional profile tries to upload', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(403)
    })

    it('returns 201 when ADMIN with a professional profile uploads to their own appointment', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${adminProfessionalAppointmentId}`)
        .set('Cookie', `access_token=${adminProfessionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(201)
    })

    it('returns 403 when ADMIN with a professional profile uploads to another professional appointment', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${adminProfessionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(403)
    })

    it('returns 403 when USER tries to upload', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${userToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(403)
    })

    it('returns 403 when PROFESSIONAL is not the owner of the appointment', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(401)
    })
  })

  describe('GET /consultation-photos', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(201)
    })

    it('returns 200 for ADMIN with the uploaded photos', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
      expect(body[0].fileName).toBe('evolucao.jpg')
    })

    it('returns 200 for PROFESSIONAL on own appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(200)

      expect(body).toHaveLength(1)
    })

    it('returns 403 when PROFESSIONAL is not the owner of the appointment', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to list', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .expect(401)
    })
  })

  describe('GET /consultation-photos/:id/file', () => {
    let photoId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(201)
      photoId = body[0].id
    })

    it('returns 200 with the file bytes for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get(`/consultation-photos/${photoId}/file`)
        .set('Cookie', `access_token=${adminToken}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })
        .expect(200)

      expect(res.headers['content-type']).toMatch(/image\/jpeg/)
      expect(res.body.toString()).toBe('fake-jpeg-bytes')
    })

    it('returns 200 for PROFESSIONAL who owns the photo', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/${photoId}/file`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(200)
    })

    it('returns 403 when PROFESSIONAL is not the owner of the photo', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/${photoId}/file`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .expect(403)
    })

    it('returns 403 when USER tries to download', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/${photoId}/file`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when the photo does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/${faker.string.uuid()}/file`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })
  })

  describe('DELETE /consultation-photos/:id', () => {
    let photoId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('fake-jpeg-bytes'), { filename: 'evolucao.jpg', contentType: 'image/jpeg' })
        .expect(201)
      photoId = body[0].id
    })

    it('returns 204 when PROFESSIONAL deletes own photo', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${photoId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(204)

      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos?appointmentId=${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(200)
      expect(body).toEqual([])
    })

    it('returns 204 when ADMIN deletes a photo belonging to a professional (ADMIN has no ownership check)', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${photoId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)
    })

    it('returns 403 when USER tries to delete', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${photoId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 403 when PROFESSIONAL is not the owner of the photo', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${photoId}`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .expect(403)
    })

    it('returns 404 when the photo does not exist', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${faker.string.uuid()}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(404)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .delete(`/consultation-photos/${photoId}`)
        .expect(401)
    })
  })

  describe('GET /consultation-photos/by-patient/:patientId', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${appointmentId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .attach('files', Buffer.from('professional-a-photo'), { filename: 'a1.jpg', contentType: 'image/jpeg' })
        .expect(201)

      await request(app.getHttpServer())
        .post(`/consultation-photos/appointments/${otherAppointmentId}`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .attach('files', Buffer.from('professional-b-photo'), { filename: 'b1.jpg', contentType: 'image/jpeg' })
        .expect(201)
    })

    it('critical isolation: PROFESSIONAL A sees only their own photo of the shared patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].fileName).toBe('a1.jpg')
    })

    it('critical isolation: PROFESSIONAL B sees only their own photo of the shared patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .set('Cookie', `access_token=${otherProfessionalToken}`)
        .expect(200)

      expect(body.total).toBe(1)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].fileName).toBe('b1.jpg')
    })

    it('ADMIN sees photos from both professionals for the same patient', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.total).toBe(2)
      expect(body.data.map((p: { fileName: string }) => p.fileName)).toEqual(
        expect.arrayContaining(['a1.jpg', 'b1.jpg']),
      )
    })

    it('includes professionalName and appointmentDate per item', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      const item = body.data.find((p: { fileName: string }) => p.fileName === 'a1.jpg')
      expect(item.professionalName).toBe('Ana Nutri')
      expect(item.appointmentDate).toBeDefined()
    })

    it('respects pagination (page/limit)', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}?page=1&limit=1`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.total).toBe(2)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(1)
    })

    it('returns 403 when USER tries to access the gallery', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}`)
        .expect(401)
    })

    it('rejects a client-supplied professionalId query param — the DTO does not accept it (server-side filtering only)', async () => {
      await request(app.getHttpServer())
        .get(`/consultation-photos/by-patient/${patientId}?professionalId=${otherProfessionalId}`)
        .set('Cookie', `access_token=${professionalToken}`)
        .expect(400)
    })
  })
})
