import * as bcrypt from 'bcrypt'
import { DataSource, ILike, IsNull } from 'typeorm'
import { AppointmentInsuranceType, AppointmentStatus, CouncilType, DayOfWeek, MedicalRecordFieldType, PatientGender, UserRole } from '@app/shared'
import { Theme } from '../../../modules/themes/entities/theme.entity'
import { CANONICAL_THEMES as SEED_THEMES } from '../themes/canonical-themes'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { User } from '../../../modules/users/entities/user.entity'
import { Specialty } from '../../../modules/specialties/entities/specialty.entity'
import { ClinicSpecialty } from '../../../modules/clinic-specialties/entities/clinic-specialty.entity'
import { Professional } from '../../../modules/professionals/entities/professional.entity'
import { ProfessionalRegistration } from '../../../modules/professionals/entities/professional-registration.entity'
import { ProfessionalSpecialty } from '../../../modules/professionals/entities/professional-specialty.entity'
import { Patient } from '../../../modules/patients/entities/patient.entity'
import { Schedule } from '../../../modules/schedules/entities/schedule.entity'
import { Appointment } from '../../../modules/appointments/entities/appointment.entity'
import { MedicalRecordCanonicalField } from '../../../modules/medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import { CANONICAL_FIELDS } from '../canonical-fields/canonical-fields'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
} from '../../../modules/medical-record-templates/entities/medical-record-template.entity'
import { MedicalRecord } from '../../../modules/medical-records/entities/medical-record.entity'
import { generateFieldKey } from '../../../modules/medical-record-templates/utils/generate-field-key.util'

const SEED_CLINIC_ID = '10000000-0000-4000-8000-000000000000'

// General (non specialty-scoped) canonical fields, sourced from the shared catalogue.
const SEED_GENERAL_CANONICAL_FIELDS = CANONICAL_FIELDS.filter((field) => !field.specialtyName)

export async function devSeed(dataSource: DataSource): Promise<void> {
  const defaultTheme = await seedThemes(dataSource)
  await seedClinic(dataSource, defaultTheme.id)
  await seedPlatformAdmin(dataSource.getRepository(User))
  await seedClinicAdmin(dataSource.getRepository(User))
  const nutritionSpecialty = await seedNutritionSpecialty(dataSource)
  await seedCanonicalFields(dataSource)
  await seedMedicalRecordTemplates(dataSource)
  await seedGeneralistProfessional(dataSource)
  await seedNutritionistProfessional(dataSource, nutritionSpecialty)
  await seedMedicalRecords(dataSource)
}

// Non-medical specialty fixture, created early so the nutrition-scoped canonical fields
// (bmi, waist_circumference) resolve against it during seedCanonicalFields.
async function seedNutritionSpecialty(dataSource: DataSource): Promise<Specialty> {
  const specialtyRepository = dataSource.getRepository(Specialty)
  let specialty = await specialtyRepository.findOneBy({ name: 'Nutrição Clínica' })
  if (!specialty) {
    specialty = await specialtyRepository.save(
      specialtyRepository.create({ name: 'Nutrição Clínica', description: null, titleName: 'nutricionista' }),
    )
    console.log('Dev seed: specialty "Nutrição Clínica" created.')
  }

  const clinicSpecialtyRepository = dataSource.getRepository(ClinicSpecialty)
  const existingClinicSpecialty = await clinicSpecialtyRepository.findOneBy({
    clinicId: SEED_CLINIC_ID,
    specialtyId: specialty.id,
  })
  if (!existingClinicSpecialty) {
    await clinicSpecialtyRepository.save(
      clinicSpecialtyRepository.create({ clinicId: SEED_CLINIC_ID, specialtyId: specialty.id }),
    )
  }

  return specialty
}

async function seedGeneralistProfessional(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User)
  const professionalRepository = dataSource.getRepository(Professional)

  const existingUser = await userRepository.findOneBy({ email: 'generalista@pulso.center' })
  if (existingUser) return

  const password = await bcrypt.hash('123123123', 10)
  const professionalUser = await userRepository.save(
    userRepository.create({
      fullName: 'Dra. Ana Generalista',
      email: 'generalista@pulso.center',
      password,
      role: UserRole.PROFESSIONAL,
      clinicId: SEED_CLINIC_ID,
    }),
  )

  const professionalEntity = professionalRepository.create({ userId: professionalUser.id, clinicId: SEED_CLINIC_ID })
  professionalEntity.registrations = [
    dataSource
      .getRepository(ProfessionalRegistration)
      .create({ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '99999', state: 'SP', isPrimary: true }),
  ]
  // Generalist: no specialties linked.
  professionalEntity.professionalSpecialties = []
  await professionalRepository.save(professionalEntity)
  console.log('Dev seed: generalist professional created.')
}

// Fixture of a non-medical professional (CRN) for manual QA of the professional form's
// council-type-driven fields.
async function seedNutritionistProfessional(dataSource: DataSource, specialty: Specialty): Promise<void> {
  const userRepository = dataSource.getRepository(User)
  const professionalRepository = dataSource.getRepository(Professional)

  const existingUser = await userRepository.findOneBy({ email: 'nutricionista@pulso.center' })
  if (existingUser) return

  const password = await bcrypt.hash('123123123', 10)
  const professionalUser = await userRepository.save(
    userRepository.create({
      fullName: 'Beatriz Nutricionista',
      email: 'nutricionista@pulso.center',
      password,
      role: UserRole.PROFESSIONAL,
      clinicId: SEED_CLINIC_ID,
    }),
  )

  const professionalEntity = professionalRepository.create({ userId: professionalUser.id, clinicId: SEED_CLINIC_ID })
  professionalEntity.registrations = [
    dataSource
      .getRepository(ProfessionalRegistration)
      .create({ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRN, number: '9876543', state: 'SP', isPrimary: true }),
  ]
  professionalEntity.professionalSpecialties = [
    dataSource.getRepository(ProfessionalSpecialty).create({ specialtyId: specialty.id, registryNumber: null }),
  ]
  await professionalRepository.save(professionalEntity)
  console.log('Dev seed: nutritionist professional (CRN) created.')
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

  const specialtyFields = CANONICAL_FIELDS.filter((field) => field.specialtyName)
  for (const data of specialtyFields) {
    const specialty = await dataSource
      .getRepository(Specialty)
      .findOne({ where: { name: ILike(data.specialtyName as string) } })
    if (!specialty) continue

    const existing = await repository.findOneBy({ canonicalKey: data.canonicalKey })
    if (!existing) {
      await repository.save(
        repository.create({
          canonicalKey: data.canonicalKey,
          label: data.label,
          type: data.type,
          options: data.options ?? null,
          unit: data.unit ?? null,
          specialtyId: specialty.id,
          description: data.description ?? null,
        }),
      )
      console.log(`Dev seed: canonical field "${data.canonicalKey}" (${data.specialtyName}) created.`)
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

  // Generalist template (no specialty) — used by generalist doctors' appointments.
  const existingGeneralist = await templateRepository.findOneBy({
    clinicId: SEED_CLINIC_ID,
    specialtyId: IsNull(),
  })
  if (!existingGeneralist) {
    const usedKeys = new Set<string>()
    const fields: MedicalRecordTemplateField[] = []
    let order = 1
    for (const canonicalKey of ['weight', 'height', 'chief_complaint']) {
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
        specialtyId: null,
        name: 'Prontuário clínico geral',
        fields,
      }),
    )
    console.log('Dev seed: generalist medical record template created.')
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
  const professionalRepository = dataSource.getRepository(Professional)
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

  let professional = await professionalRepository.findOneBy({ clinicId: SEED_CLINIC_ID })
  if (!professional) {
    let professionalUser = await userRepository.findOneBy({ email: 'doctor@pulso.center' })
    if (!professionalUser) {
      professionalUser = await userRepository.save(
        userRepository.create({
          fullName: 'Dr. João Silva',
          email: 'doctor@pulso.center',
          password,
          role: UserRole.PROFESSIONAL,
          clinicId: SEED_CLINIC_ID,
        }),
      )
    }
    const specialty = await dataSource.getRepository(Specialty).findOneBy({ id: specialtyId })
    const professionalEntity = professionalRepository.create({ userId: professionalUser.id, clinicId: SEED_CLINIC_ID })
    professionalEntity.registrations = [
      dataSource
        .getRepository(ProfessionalRegistration)
        .create({ clinicId: SEED_CLINIC_ID, councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }),
    ]
    professionalEntity.professionalSpecialties = specialty
      ? [dataSource.getRepository(ProfessionalSpecialty).create({ specialtyId: specialty.id, registryNumber: '11223' })]
      : []
    professional = await professionalRepository.save(professionalEntity)
    console.log('Dev seed: seed professional created.')
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

  let schedule = await scheduleRepository.findOneBy({ professionalId: professional.id })
  if (!schedule) {
    schedule = await scheduleRepository.save(
      scheduleRepository.create({
        professionalId: professional.id,
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
        professionalId: professional.id,
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
        professionalId: professional.id,
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
