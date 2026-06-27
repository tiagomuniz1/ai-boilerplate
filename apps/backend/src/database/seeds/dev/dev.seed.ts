import * as bcrypt from 'bcrypt'
import { DataSource, ILike } from 'typeorm'
import { AppointmentInsuranceType, AppointmentStatus, DayOfWeek, MedicalRecordFieldType, PatientGender, ThemeBorderRadius, UserRole } from '@app/shared'
import { Theme } from '../../../modules/themes/entities/theme.entity'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { User } from '../../../modules/users/entities/user.entity'
import { Specialty } from '../../../modules/specialties/entities/specialty.entity'
import { ClinicSpecialty } from '../../../modules/clinic-specialties/entities/clinic-specialty.entity'
import { Doctor } from '../../../modules/doctors/entities/doctor.entity'
import { Patient } from '../../../modules/patients/entities/patient.entity'
import { Schedule } from '../../../modules/schedules/entities/schedule.entity'
import { Appointment } from '../../../modules/appointments/entities/appointment.entity'
import { MedicalRecordCanonicalField } from '../../../modules/medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
} from '../../../modules/medical-record-templates/entities/medical-record-template.entity'
import { MedicalRecord } from '../../../modules/medical-records/entities/medical-record.entity'
import { generateFieldKey } from '../../../modules/medical-record-templates/utils/generate-field-key.util'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

const SEED_THEMES = [
  {
    name: 'Teal Moderno',
    slug: 'teal-moderno',
    accentColor: '#0D9488',
    accentSoftColor: '#CCFBF1',
    isDefault: false,
    borderRadius: ThemeBorderRadius.SHARP,
  },
  {
    name: 'Rosé Cuidado',
    slug: 'rose-cuidado',
    accentColor: '#E11D48',
    accentSoftColor: '#FFE4E6',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
  },
  {
    name: 'Salvia Natural',
    slug: 'salvia-natural',
    accentColor: '#6D7A71',
    accentSoftColor: '#CDD9C5',
    isDefault: true,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#EFEADD',
    bgDarkColor: '#111A13',
  },
  {
    name: 'Pétala',
    slug: 'petala',
    accentColor: '#C8717C',
    accentSoftColor: '#F7E2E5',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FDF4F5',
    bgDarkColor: '#1C1014',
  },
  {
    name: 'Carmim',
    slug: 'carmim',
    accentColor: '#C44F6A',
    accentSoftColor: '#FAE0E6',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: '#FDF8F9',
    bgDarkColor: '#1A0D12',
  },
  {
    name: 'Âmbar',
    slug: 'ambar',
    accentColor: '#A8836A',
    accentSoftColor: '#F3E8DF',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
    bgColor: '#FAF5F0',
    bgDarkColor: '#1C1410',
  },
  {
    name: 'Mel',
    slug: 'mel',
    accentColor: '#9A7B4A',
    accentSoftColor: '#F3E8D5',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FDFAF4',
    bgDarkColor: '#191410',
  },
  {
    name: 'Pulso',
    slug: 'pulso',
    accentColor: '#5B1027',
    accentSoftColor: '#F5D8DF',
    isDefault: false,
    borderRadius: ThemeBorderRadius.ROUND,
    bgColor: '#FAF7F4',
    bgDarkColor: '#0B1120',
  },
  {
    name: 'Azul Clínico',
    slug: 'azul-clinico',
    accentColor: '#2563EB',
    accentSoftColor: '#DBEAFE',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  },
  {
    name: 'Roxo Bem-Estar',
    slug: 'roxo-bem-estar',
    accentColor: '#7C3AED',
    accentSoftColor: '#EDE9FE',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  },
  {
    name: 'Verde Saúde',
    slug: 'verde-saude',
    accentColor: '#16A34A',
    accentSoftColor: '#DCFCE7',
    isDefault: false,
    borderRadius: ThemeBorderRadius.DEFAULT,
  },
]

const SEED_GENERAL_CANONICAL_FIELDS: Array<{
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  unit?: string
}> = [
  { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER, unit: 'kg' },
  { canonicalKey: 'height', label: 'Altura', type: MedicalRecordFieldType.NUMBER, unit: 'cm' },
  { canonicalKey: 'blood_pressure', label: 'Pressão arterial', type: MedicalRecordFieldType.TEXT, unit: 'mmHg' },
  { canonicalKey: 'heart_rate', label: 'Frequência cardíaca', type: MedicalRecordFieldType.NUMBER, unit: 'bpm' },
  { canonicalKey: 'temperature', label: 'Temperatura', type: MedicalRecordFieldType.NUMBER, unit: '°C' },
  { canonicalKey: 'chief_complaint', label: 'Queixa principal', type: MedicalRecordFieldType.TEXTAREA },
  { canonicalKey: 'allergies', label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA },
  { canonicalKey: 'smoker', label: 'Fumante', type: MedicalRecordFieldType.BOOLEAN },
]

export async function devSeed(dataSource: DataSource): Promise<void> {
  const defaultTheme = await seedThemes(dataSource)
  await seedClinic(dataSource, defaultTheme.id)
  await seedPlatformAdmin(dataSource.getRepository(User))
  await seedClinicAdmin(dataSource.getRepository(User))
  await seedCanonicalFields(dataSource)
  await seedMedicalRecordTemplates(dataSource)
  await seedMedicalRecords(dataSource)
}

async function seedCanonicalFields(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(MedicalRecordCanonicalField)

  for (const data of SEED_GENERAL_CANONICAL_FIELDS) {
    const existing = await repository.findOneBy({ canonicalKey: data.canonicalKey })
    if (!existing) {
      await repository.save(
        repository.create({
          canonicalKey: data.canonicalKey,
          label: data.label,
          type: data.type,
          options: null,
          unit: data.unit ?? null,
          specialtyId: null,
          description: null,
        }),
      )
      console.log(`Dev seed: canonical field "${data.canonicalKey}" created.`)
    }
  }

  const cardiology = await dataSource
    .getRepository(Specialty)
    .findOne({ where: { name: ILike('Cardiologia') } })

  if (cardiology) {
    const existing = await repository.findOneBy({ canonicalKey: 'risk_level' })
    if (!existing) {
      await repository.save(
        repository.create({
          canonicalKey: 'risk_level',
          label: 'Nível de risco',
          type: MedicalRecordFieldType.SELECT,
          options: [
            { value: 'low', label: 'Baixo' },
            { value: 'moderate', label: 'Moderado' },
            { value: 'high', label: 'Alto' },
          ],
          unit: null,
          specialtyId: cardiology.id,
          description: null,
        }),
      )
      console.log('Dev seed: canonical field "risk_level" (cardiology) created.')
    }
  }
}

async function seedMedicalRecordTemplates(dataSource: DataSource): Promise<void> {
  const templateRepository = dataSource.getRepository(MedicalRecordTemplate)
  const canonicalRepository = dataSource.getRepository(MedicalRecordCanonicalField)
  const clinicSpecialties = await dataSource
    .getRepository(ClinicSpecialty)
    .find({ where: { clinicId: SEED_CLINIC_ID } })

  for (const clinicSpecialty of clinicSpecialties) {
    const existing = await templateRepository.findOneBy({
      clinicId: SEED_CLINIC_ID,
      specialtyId: clinicSpecialty.specialtyId,
    })
    if (existing) continue

    const usedKeys = new Set<string>()
    const fields: MedicalRecordTemplateField[] = []

    const canonicalKeys = ['weight', 'height']
    let order = 1
    for (const canonicalKey of canonicalKeys) {
      const canonical = await canonicalRepository.findOneBy({ canonicalKey })
      if (!canonical) continue
      fields.push({
        key: generateFieldKey(canonical.label, usedKeys),
        label: canonical.label,
        type: canonical.type,
        required: false,
        order,
        options: canonical.options,
        placeholder: null,
        helpText: null,
        canonical: true,
        canonicalKey: canonical.canonicalKey,
        sectionKey: null,
      })
      order += 1
    }

    await templateRepository.save(
      templateRepository.create({
        clinicId: SEED_CLINIC_ID,
        specialtyId: clinicSpecialty.specialtyId,
        name: 'Prontuário padrão',
        fields,
      }),
    )
    console.log(`Dev seed: medical record template for specialty ${clinicSpecialty.specialtyId} created.`)
  }
}

async function seedThemes(dataSource: DataSource): Promise<Theme> {
  const repository = dataSource.getRepository(Theme)

  for (const data of SEED_THEMES) {
    const existing = await repository.findOneBy({ slug: data.slug })
    if (!existing) {
      await repository.save(repository.create(data))
      console.log(`Dev seed: theme "${data.name}" created.`)
    }
  }

  const defaultTheme = await repository.findOneByOrFail({ isDefault: true })
  return defaultTheme
}

async function seedClinic(dataSource: DataSource, defaultThemeId: string): Promise<void> {
  const repository = dataSource.getRepository(Clinic)
  const existing = await repository.findOneBy({ id: SEED_CLINIC_ID })

  if (!existing) {
    await repository
      .createQueryBuilder()
      .insert()
      .into(Clinic)
      .values({
        id: SEED_CLINIC_ID,
        name: 'Pulso',
        slug: 'pulso',
        isActive: true,
        themeId: defaultThemeId,
      })
      .execute()
    console.log('Dev seed: Pulso clinic created.')
    return
  }

  const needsUpdate: Record<string, unknown> = {}
  if (!existing.themeId) needsUpdate.themeId = defaultThemeId
  if (existing.name !== 'Pulso') needsUpdate.name = 'Pulso'
  if (existing.slug !== 'pulso') needsUpdate.slug = 'pulso'

  if (Object.keys(needsUpdate).length > 0) {
    await repository.update(SEED_CLINIC_ID, needsUpdate)
    console.log('Dev seed: Pulso clinic updated.')
  } else {
    console.log('Dev seed: Pulso clinic already exists, skipping.')
  }
}

async function seedPlatformAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'platform@pulso.center' })
  if (existing) {
    if (existing.role !== UserRole.PLATFORM_ADMIN) {
      await repository.update(existing.id, { role: UserRole.PLATFORM_ADMIN, clinicId: null })
      console.log('Dev seed: updated platform admin role.')
    } else {
      console.log('Dev seed: platform admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Platform Admin',
      email: 'platform@pulso.center',
      password,
      role: UserRole.PLATFORM_ADMIN,
      clinicId: null,
    }),
  )

  console.log('Dev seed: platform admin created.')
}

async function seedClinicAdmin(repository: ReturnType<DataSource['getRepository']>): Promise<void> {
  const existing = await repository.findOneBy({ email: 'admin@pulso.center' })
  if (existing) {
    const updates: Record<string, unknown> = {}
    if (existing.role !== UserRole.ADMIN) updates.role = UserRole.ADMIN
    if (!existing.clinicId) updates.clinicId = SEED_CLINIC_ID

    if (Object.keys(updates).length > 0) {
      await repository.update(existing.id, updates)
      console.log('Dev seed: updated clinic admin.')
    } else {
      console.log('Dev seed: clinic admin already exists, skipping.')
    }
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  await repository.save(
    repository.create({
      fullName: 'Administrator',
      email: 'admin@pulso.center',
      password,
      role: UserRole.ADMIN,
      clinicId: SEED_CLINIC_ID,
    }),
  )

  console.log('Dev seed: clinic admin created.')
}

async function seedMedicalRecords(dataSource: DataSource): Promise<void> {
  const recordRepository = dataSource.getRepository(MedicalRecord)
  const existing = await recordRepository.count()
  if (existing > 0) {
    console.log('Dev seed: medical records already exist, skipping.')
    return
  }

  const userRepository = dataSource.getRepository(User)
  const doctorRepository = dataSource.getRepository(Doctor)
  const patientRepository = dataSource.getRepository(Patient)
  const scheduleRepository = dataSource.getRepository(Schedule)
  const appointmentRepository = dataSource.getRepository(Appointment)
  const templateRepository = dataSource.getRepository(MedicalRecordTemplate)

  const clinicSpecialties = await dataSource
    .getRepository(ClinicSpecialty)
    .find({ where: { clinicId: SEED_CLINIC_ID }, take: 1 })

  if (clinicSpecialties.length === 0) {
    console.log('Dev seed: no clinic specialties found, skipping medical records.')
    return
  }

  const specialtyId = clinicSpecialties[0].specialtyId
  const template = await templateRepository.findOne({ where: { clinicId: SEED_CLINIC_ID, specialtyId } })
  if (!template) {
    console.log('Dev seed: no template found for specialty, skipping medical records.')
    return
  }

  const password = await bcrypt.hash('123123123', 10)
  const adminUser = await userRepository.findOneBy({ email: 'admin@pulso.center' })
  if (!adminUser) return

  let doctor = await doctorRepository.findOneBy({ clinicId: SEED_CLINIC_ID })
  if (!doctor) {
    let doctorUser = await userRepository.findOneBy({ email: 'doctor@pulso.center' })
    if (!doctorUser) {
      doctorUser = await userRepository.save(
        userRepository.create({
          fullName: 'Dr. João Silva',
          email: 'doctor@pulso.center',
          password,
          role: UserRole.DOCTOR,
          clinicId: SEED_CLINIC_ID,
        }),
      )
    }
    const specialty = await dataSource.getRepository(Specialty).findOneBy({ id: specialtyId })
    const doctorEntity = doctorRepository.create({ userId: doctorUser.id, crmNumber: '12345/SP', clinicId: SEED_CLINIC_ID })
    doctorEntity.specialties = specialty ? [specialty] : []
    doctor = await doctorRepository.save(doctorEntity)
    console.log('Dev seed: seed doctor created.')
  }

  let patient = await patientRepository.findOneBy({ clinicId: SEED_CLINIC_ID })
  if (!patient) {
    let patientUser = await userRepository.findOneBy({ email: 'patient@pulso.center' })
    if (!patientUser) {
      patientUser = await userRepository.save(
        userRepository.create({
          fullName: 'Maria Fernandes',
          email: 'patient@pulso.center',
          password,
          role: UserRole.USER,
          clinicId: SEED_CLINIC_ID,
        }),
      )
    }
    patient = await patientRepository.save(
      patientRepository.create({
        userId: patientUser.id,
        clinicId: SEED_CLINIC_ID,
        documentNumber: '12345678901',
        phoneNumber: '11987654321',
        birthDate: '1985-03-20',
        gender: PatientGender.FEMALE,
      }),
    )
    console.log('Dev seed: seed patient created.')
  }

  let schedule = await scheduleRepository.findOneBy({ doctorId: doctor.id })
  if (!schedule) {
    schedule = await scheduleRepository.save(
      scheduleRepository.create({
        doctorId: doctor.id,
        clinicId: SEED_CLINIC_ID,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationInMinutes: 30,
        validFrom: null,
        validUntil: null,
      }),
    )
    console.log('Dev seed: seed schedule created.')
  }

  // Appointments over the last 30 days with a mix of statuses and insurance types
  const today = new Date()
  const appointmentDefs: Array<{
    daysAgo: number
    startTime: string
    endTime: string
    status: AppointmentStatus
    insuranceType: AppointmentInsuranceType | null
    withRecord: boolean
  }> = [
    { daysAgo: 29, startTime: '08:00', endTime: '08:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
    { daysAgo: 27, startTime: '08:30', endTime: '09:00', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.CONVENIO, withRecord: true },
    { daysAgo: 25, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
    { daysAgo: 22, startTime: '08:00', endTime: '08:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.CONVENIO, withRecord: true },
    { daysAgo: 20, startTime: '08:30', endTime: '09:00', status: AppointmentStatus.NO_SHOW, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: false },
    { daysAgo: 18, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.COMPLETED, insuranceType: null, withRecord: true },
    { daysAgo: 15, startTime: '08:00', endTime: '08:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
    { daysAgo: 13, startTime: '08:30', endTime: '09:00', status: AppointmentStatus.CANCELLED, insuranceType: AppointmentInsuranceType.CONVENIO, withRecord: false },
    { daysAgo: 11, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
    { daysAgo: 8, startTime: '08:00', endTime: '08:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.CONVENIO, withRecord: true },
    { daysAgo: 6, startTime: '08:30', endTime: '09:00', status: AppointmentStatus.NO_SHOW, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: false },
    { daysAgo: 4, startTime: '09:00', endTime: '09:30', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
    { daysAgo: 2, startTime: '08:00', endTime: '08:30', status: AppointmentStatus.CONFIRMED, insuranceType: AppointmentInsuranceType.CONVENIO, withRecord: false },
    { daysAgo: 1, startTime: '08:30', endTime: '09:00', status: AppointmentStatus.COMPLETED, insuranceType: AppointmentInsuranceType.PARTICULAR, withRecord: true },
  ]

  for (const def of appointmentDefs) {
    const apptDate = new Date(today)
    apptDate.setUTCDate(apptDate.getUTCDate() - def.daysAgo)
    const dateStr = apptDate.toISOString().split('T')[0]

    const existingAppt = await appointmentRepository.findOneBy({
      clinicId: SEED_CLINIC_ID,
      date: dateStr,
      startTime: def.startTime,
    })
    if (existingAppt) continue

    const appointment = await appointmentRepository.save(
      appointmentRepository.create({
        clinicId: SEED_CLINIC_ID,
        doctorId: doctor.id,
        patientId: patient.id,
        specialtyId,
        scheduleId: schedule.id,
        date: dateStr,
        startTime: def.startTime,
        endTime: def.endTime,
        status: def.status,
        insuranceType: def.insuranceType,
        reason: 'Consulta de rotina',
        cancellationReason: def.status === AppointmentStatus.CANCELLED ? 'Paciente remarcou' : null,
      }),
    )

    if (!def.withRecord || def.status !== AppointmentStatus.COMPLETED) {
      console.log(`Dev seed: appointment ${dateStr} ${def.startTime} (${def.status}) created.`)
      continue
    }

    const data: Record<string, unknown> = {}
    for (const field of template.fields) {
      if (field.type === MedicalRecordFieldType.NUMBER) data[field.key] = 70
      else if (field.type === MedicalRecordFieldType.TEXT || field.type === MedicalRecordFieldType.TEXTAREA) data[field.key] = 'Sem queixas.'
      else if (field.type === MedicalRecordFieldType.BOOLEAN) data[field.key] = false
    }

    await recordRepository.save(
      recordRepository.create({
        clinicId: SEED_CLINIC_ID,
        appointmentId: appointment.id,
        patientId: patient.id,
        doctorId: doctor.id,
        specialtyId,
        templateId: template.id,
        templateSchemaSnapshot: template.fields,
        data,
        notes: 'Paciente em bom estado geral.',
      }),
    )
    console.log(`Dev seed: medical record for appointment ${dateStr} ${def.startTime} created.`)
  }
}
