import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as cookieParser from 'cookie-parser'
import * as request from 'supertest'
import { Repository } from 'typeorm'
import { AppointmentStatus, DayOfWeek, MedicalRecordFieldType, PatientGender, UserRole } from '@app/shared'
import { AppModule } from '../../../app.module'
import { Clinic } from '../../clinics/entities/clinic.entity'
import { User } from '../../users/entities/user.entity'
import { Doctor } from '../../doctors/entities/doctor.entity'
import { Patient } from '../../patients/entities/patient.entity'
import { Specialty } from '../../specialties/entities/specialty.entity'
import { Schedule } from '../../schedules/entities/schedule.entity'
import { Appointment } from '../../appointments/entities/appointment.entity'
import { MedicalRecordTemplate } from '../../medical-record-templates/entities/medical-record-template.entity'
import { MedicalRecord } from '../entities/medical-record.entity'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000099'

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

describe('MedicalRecordsController (integration)', () => {
  let app: INestApplication
  let userRepository: Repository<User>
  let clinicRepository: Repository<Clinic>
  let doctorRepository: Repository<Doctor>
  let patientRepository: Repository<Patient>
  let specialtyRepository: Repository<Specialty>
  let scheduleRepository: Repository<Schedule>
  let appointmentRepository: Repository<Appointment>
  let templateRepository: Repository<MedicalRecordTemplate>
  let recordRepository: Repository<MedicalRecord>

  let adminToken: string
  let doctorToken: string
  let otherDoctorToken: string
  let userToken: string
  let doctorId: string
  let otherDoctorId: string
  let patientId: string
  let specialtyId: string
  let appointmentId: string
  let templateId: string
  let templateFields: any[]

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
    templateRepository = module.get(getRepositoryToken(MedicalRecordTemplate))
    recordRepository = module.get(getRepositoryToken(MedicalRecord))
  })

  beforeEach(async () => {
    await recordRepository.query('DELETE FROM test.medical_records')
    await recordRepository.query('DELETE FROM test.medical_record_templates')
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
        name: 'Medical Records Clinic',
        slug: 'mr-clinic',
        isActive: true,
      }),
    )

    const hashed = await bcrypt.hash(password, 1)

    await userRepository.save(
      userRepository.create({
        fullName: 'Admin User',
        email: 'admin@mr.test',
        password: hashed,
        role: UserRole.ADMIN,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const doctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Doctor Smith',
        email: 'doctor@mr.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const otherDoctorUser = await userRepository.save(
      userRepository.create({
        fullName: 'Other Doctor',
        email: 'other@mr.test',
        password: hashed,
        role: UserRole.DOCTOR,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    await userRepository.save(
      userRepository.create({
        fullName: 'Regular User',
        email: 'user@mr.test',
        password: hashed,
        role: UserRole.USER,
        clinicId: SEED_CLINIC_ID,
      }),
    )

    const specialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Cardiologia' }),
    )
    specialtyId = specialty.id

    const doctorEntity = doctorRepository.create({
      userId: doctorUser.id,
      crmNumber: '12345/SP',
      clinicId: SEED_CLINIC_ID,
    })
    doctorEntity.specialties = [specialty]
    const doctorProfile = await doctorRepository.save(doctorEntity)
    doctorId = doctorProfile.id

    const otherDoctorEntity = doctorRepository.create({
      userId: otherDoctorUser.id,
      crmNumber: '99999/SP',
      clinicId: SEED_CLINIC_ID,
    })
    otherDoctorEntity.specialties = [specialty]
    const otherDoctorProfile = await doctorRepository.save(otherDoctorEntity)
    otherDoctorId = otherDoctorProfile.id

    const patientUser = await userRepository.save(
      userRepository.create({
        fullName: 'Patient Jones',
        email: 'patient@mr.test',
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
        specialtyId,
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

    templateFields = [
      {
        key: 'weight_abc1',
        label: 'Peso',
        type: MedicalRecordFieldType.NUMBER,
        required: false,
        order: 1,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      },
      {
        key: 'notes_def2',
        label: 'Observações',
        type: MedicalRecordFieldType.TEXTAREA,
        required: false,
        order: 2,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      },
    ]

    const template = await templateRepository.save(
      templateRepository.create({
        clinicId: SEED_CLINIC_ID,
        specialtyId,
        name: 'Prontuário Cardiologia',
        fields: templateFields,
        isActive: true,
      }),
    )
    templateId = template.id

    const loginAndExtractToken = async (email: string) => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password, slug: 'mr-clinic' })
      const rawCookies = res.headers['set-cookie']
      if (!rawCookies) throw new Error(`Login failed for ${email}: status ${res.status}`)
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies as string]
      const match = cookies.find((c: string) => c?.startsWith('access_token_mr-clinic='))
      return match ? match.slice('access_token_mr-clinic='.length).split(';')[0] : ''
    }

    adminToken = await loginAndExtractToken('admin@mr.test')
    doctorToken = await loginAndExtractToken('doctor@mr.test')
    otherDoctorToken = await loginAndExtractToken('other@mr.test')
    userToken = await loginAndExtractToken('user@mr.test')
  })

  afterAll(async () => {
    await recordRepository.query('DELETE FROM test.medical_records')
    await recordRepository.query('DELETE FROM test.medical_record_templates')
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

  describe('POST /medical-records', () => {
    it('returns 201 with created record inheriting specialtyId from appointment', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: { weight_abc1: 75 } })
        .expect(201)

      expect(body.id).toBeDefined()
      expect(body.appointmentId).toBe(appointmentId)
      expect(body.specialtyId).toBe(specialtyId)
      expect(body.templateId).toBe(templateId)
      expect(body.patientId).toBe(patientId)
      expect(body.doctorId).toBe(doctorId)
      expect(body.patientName).toBe('Patient Jones')
      expect(body.doctorName).toBe('Doctor Smith')
      expect(body.specialtyName).toBe('Cardiologia')
      expect(body.templateSchemaSnapshot).toHaveLength(2)
    })

    it('snapshot matches template fields at creation time', async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)

      expect(body.templateSchemaSnapshot[0].key).toBe('weight_abc1')
      expect(body.templateSchemaSnapshot[1].key).toBe('notes_def2')
    })

    it('DOCTOR can create record for own appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)
    })

    it('returns 403 when DOCTOR creates for another doctor appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({ appointmentId, data: {} })
        .expect(403)
    })

    it('returns 422 when data has required field missing', async () => {
      const requiredField = {
        key: 'complaint_xxx1',
        label: 'Queixa',
        type: MedicalRecordFieldType.TEXT,
        required: true,
        order: 3,
        options: null,
        placeholder: null,
        helpText: null,
        canonical: false,
        canonicalKey: null,
      }
      await templateRepository.update(templateId, { fields: [...templateFields, requiredField] })

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(422)
    })

    it('returns 422 when data has unknown field key', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: { unknown_field: 'value' } })
        .expect(422)
    })

    it('returns 422 when data has wrong type', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: { weight_abc1: 'not-a-number' } })
        .expect(422)
    })

    it('returns 409 when medical record already exists for appointment', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)

      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(409)
    })

    it('returns 422 when appointment has no specialtyId', async () => {
      const noSpecAppt = await appointmentRepository.save(
        appointmentRepository.create({
          clinicId: SEED_CLINIC_ID,
          doctorId,
          patientId,
          specialtyId: null,
          scheduleId: (await scheduleRepository.findOneByOrFail({ doctorId })).id,
          date: '2026-01-06',
          startTime: '09:00',
          endTime: '09:30',
          status: AppointmentStatus.SCHEDULED,
          reason: null,
          cancellationReason: null,
        }),
      )
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId: noSpecAppt.id, data: {} })
        .expect(422)
    })

    it('returns 403 for USER role', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${userToken}`)
        .send({ appointmentId, data: {} })
        .expect(403)
    })

    it('returns 401 for unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .send({ appointmentId, data: {} })
        .expect(401)
    })

    it('enforces FK composta: template specialty must match appointment specialty', async () => {
      // Force a specialty mismatch at DB level by trying direct insert
      const otherSpecialty = await specialtyRepository.save(
        specialtyRepository.create({ name: 'Dermatologia' }),
      )

      await expect(
        recordRepository.query(`
          INSERT INTO test.medical_records
            (clinic_id, appointment_id, patient_id, doctor_id, specialty_id, template_id, template_schema_snapshot, data)
          VALUES
            ($1, $2, $3, $4, $5, $6, '[]'::jsonb, '{}'::jsonb)
        `, [SEED_CLINIC_ID, appointmentId, patientId, doctorId, otherSpecialty.id, templateId]),
      ).rejects.toThrow()
    })
  })

  describe('GET /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 200 with record for ADMIN', async () => {
      const { body } = await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.id).toBe(recordId)
    })

    it('returns 200 for DOCTOR (own record)', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(200)
    })

    it('returns 404 for DOCTOR accessing another doctor record', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(404)
    })

    it('returns 404 when record not found', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/00000000-0000-0000-0000-000000000000`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })
  })

  describe('GET /medical-records/by-appointment/:appointmentId', () => {
    it('returns 404 when no record exists for appointment', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })

    it('returns record when it exists', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(200)

      expect(body.appointmentId).toBe(appointmentId)
    })

    it('returns 403 when DOCTOR checks another doctor appointment', async () => {
      await request(app.getHttpServer())
        .get(`/medical-records/by-appointment/${appointmentId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .expect(403)
    })
  })

  describe('GET /medical-records?patientId=...', () => {
    it('returns paginated records for ADMIN', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .query({ patientId })
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.total).toBe(1)
      expect(body.page).toBe(1)
      expect(body.limit).toBe(20)
    })

    it('DOCTOR sees only own records', async () => {
      await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)

      const { body } = await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${doctorToken}`)
        .query({ patientId })
        .expect(200)

      expect(body.data).toHaveLength(1)
      expect(body.data[0].doctorId).toBe(doctorId)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .get('/medical-records')
        .set('Cookie', `access_token=${userToken}`)
        .query({ patientId })
        .expect(403)
    })
  })

  describe('PATCH /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 200 with updated record', async () => {
      const { body } = await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ notes: 'Updated notes' })
        .expect(200)

      expect(body.notes).toBe('Updated notes')
    })

    it('DOCTOR can update own record', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .send({ notes: 'Doctor notes' })
        .expect(200)
    })

    it('returns 403 when DOCTOR updates another doctor record', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${otherDoctorToken}`)
        .send({ notes: 'Hacked' })
        .expect(403)
    })

    it('returns 422 when appointment is completed', async () => {
      await appointmentRepository.update(appointmentId, { status: AppointmentStatus.COMPLETED })

      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ data: { weight_abc1: 80 } })
        .expect(422)
    })

    it('validates data against snapshot (not current template)', async () => {
      await templateRepository.update(templateId, {
        fields: [
          ...templateFields,
          {
            key: 'new_field_xyz9',
            label: 'New Field',
            type: MedicalRecordFieldType.TEXT,
            required: false,
            order: 3,
            options: null,
            placeholder: null,
            helpText: null,
            canonical: false,
            canonicalKey: null,
          },
        ],
      })

      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .send({ data: { new_field_xyz9: 'value' } })
        .expect(422)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .patch(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .send({ notes: 'x' })
        .expect(403)
    })
  })

  describe('DELETE /medical-records/:id', () => {
    let recordId: string

    beforeEach(async () => {
      const { body } = await request(app.getHttpServer())
        .post('/medical-records')
        .set('Cookie', `access_token=${adminToken}`)
        .send({ appointmentId, data: {} })
        .expect(201)
      recordId = body.id
    })

    it('returns 204 for ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(204)

      const deleted = await recordRepository.findOne({ where: { id: recordId }, withDeleted: true })
      expect(deleted?.deletedAt).not.toBeNull()
    })

    it('returns 403 for DOCTOR', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${doctorToken}`)
        .expect(403)
    })

    it('returns 403 for USER', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/${recordId}`)
        .set('Cookie', `access_token=${userToken}`)
        .expect(403)
    })

    it('returns 404 when record not found', async () => {
      await request(app.getHttpServer())
        .delete(`/medical-records/00000000-0000-0000-0000-000000000000`)
        .set('Cookie', `access_token=${adminToken}`)
        .expect(404)
    })
  })
})
