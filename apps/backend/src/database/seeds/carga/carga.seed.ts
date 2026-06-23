import * as bcrypt from 'bcrypt'
import { DataSource } from 'typeorm'
import {
  DayOfWeek,
  MedicalRecordFieldType,
  UserRole,
} from '@app/shared'
import { Clinic } from '../../../modules/clinics/entities/clinic.entity'
import { User } from '../../../modules/users/entities/user.entity'
import { Specialty } from '../../../modules/specialties/entities/specialty.entity'
import { ClinicSpecialty } from '../../../modules/clinic-specialties/entities/clinic-specialty.entity'
import { Doctor } from '../../../modules/doctors/entities/doctor.entity'
import { Schedule } from '../../../modules/schedules/entities/schedule.entity'
import {
  MedicalRecordTemplate,
  MedicalRecordTemplateField,
  MedicalRecordTemplateSection,
} from '../../../modules/medical-record-templates/entities/medical-record-template.entity'
import { MedicalRecordCanonicalField } from '../../../modules/medical-record-canonical-fields/entities/medical-record-canonical-field.entity'
import { generateFieldKey } from '../../../modules/medical-record-templates/utils/generate-field-key.util'

export const CARGA_CLINIC_ID = '20000000-0000-4000-8000-000000000000'
const CARGA_CLINIC_SLUG = 'pulso-carga'
const TOTAL_DOCTORS = 200
const TOTAL_PATIENTS = 2_000_000
const TOTAL_APPOINTMENTS = 4_000_000

const SPECIALTIES = [
  { name: 'Cardiologia', key: 'cardiologia' },
  { name: 'Ortopedia', key: 'ortopedia' },
  { name: 'Neurologia', key: 'neurologia' },
  { name: 'Pediatria', key: 'pediatria' },
  { name: 'Dermatologia', key: 'dermatologia' },
]

// Template definitions per specialty with sections and standalone fields
const TEMPLATE_DEFINITIONS: Record<string, {
  sections: Array<{ key: string; title: string; order: number }>
  fields: Array<{
    label: string
    type: MedicalRecordFieldType
    required: boolean
    sectionKey: string | null
    canonicalKey?: string
    options?: Array<{ value: string; label: string }>
    placeholder?: string
    helpText?: string
  }>
}> = {
  cardiologia: {
    sections: [
      { key: 'sinais_vitais', title: 'Sinais Vitais', order: 1 },
      { key: 'historico_clinico', title: 'Histórico Clínico', order: 2 },
    ],
    fields: [
      // Secção: Sinais Vitais
      { label: 'Pressão Arterial', type: MedicalRecordFieldType.TEXT, required: true, sectionKey: 'sinais_vitais', canonicalKey: 'blood_pressure', placeholder: 'Ex: 120/80 mmHg' },
      { label: 'Frequência Cardíaca', type: MedicalRecordFieldType.NUMBER, required: true, sectionKey: 'sinais_vitais', canonicalKey: 'heart_rate', placeholder: 'bpm' },
      { label: 'Saturação O₂', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: 'sinais_vitais', placeholder: '%' },
      // Secção: Histórico Clínico
      { label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: 'historico_clinico', canonicalKey: 'allergies' },
      { label: 'Nível de Risco', type: MedicalRecordFieldType.SELECT, required: true, sectionKey: 'historico_clinico', options: [{ value: 'low', label: 'Baixo' }, { value: 'moderate', label: 'Moderado' }, { value: 'high', label: 'Alto' }] },
      // Standalone (sem seção)
      { label: 'Peso', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: null, canonicalKey: 'weight', placeholder: 'kg' },
      { label: 'Altura', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: null, canonicalKey: 'height', placeholder: 'cm' },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
    ],
  },
  ortopedia: {
    sections: [
      { key: 'avaliacao_fisica', title: 'Avaliação Física', order: 1 },
      { key: 'historico_trauma', title: 'Histórico de Trauma', order: 2 },
    ],
    fields: [
      // Secção: Avaliação Física
      { label: 'Localização da Dor', type: MedicalRecordFieldType.TEXT, required: true, sectionKey: 'avaliacao_fisica', placeholder: 'Ex: joelho direito' },
      { label: 'Intensidade da Dor (0-10)', type: MedicalRecordFieldType.NUMBER, required: true, sectionKey: 'avaliacao_fisica' },
      { label: 'Limitação de Movimento', type: MedicalRecordFieldType.SELECT, required: false, sectionKey: 'avaliacao_fisica', options: [{ value: 'none', label: 'Nenhuma' }, { value: 'partial', label: 'Parcial' }, { value: 'total', label: 'Total' }] },
      // Secção: Histórico de Trauma
      { label: 'Trauma Recente', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'historico_trauma' },
      { label: 'Descrição do Evento', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: 'historico_trauma', helpText: 'Descreva como ocorreu o trauma, se aplicável' },
      // Standalone
      { label: 'Peso', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: null, canonicalKey: 'weight' },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
    ],
  },
  neurologia: {
    sections: [
      { key: 'exame_neurologico', title: 'Exame Neurológico', order: 1 },
      { key: 'queixas', title: 'Queixas', order: 2 },
    ],
    fields: [
      // Secção: Exame Neurológico
      { label: 'Escala de Glasgow', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: 'exame_neurologico', helpText: '3 (mínimo) a 15 (máximo)' },
      { label: 'Reflexos', type: MedicalRecordFieldType.SELECT, required: false, sectionKey: 'exame_neurologico', options: [{ value: 'normal', label: 'Normal' }, { value: 'hyperreflexia', label: 'Hiperreflexia' }, { value: 'hyporeflexia', label: 'Hiporreflexia' }] },
      { label: 'Orientação no Tempo e Espaço', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'exame_neurologico' },
      // Secção: Queixas
      { label: 'Queixa Principal', type: MedicalRecordFieldType.TEXTAREA, required: true, sectionKey: 'queixas', canonicalKey: 'chief_complaint' },
      { label: 'Cefaleia', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'queixas' },
      { label: 'Tontura', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'queixas' },
      // Standalone
      { label: 'Pressão Arterial', type: MedicalRecordFieldType.TEXT, required: false, sectionKey: null, canonicalKey: 'blood_pressure' },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
    ],
  },
  pediatria: {
    sections: [
      { key: 'crescimento', title: 'Crescimento e Desenvolvimento', order: 1 },
      { key: 'vacinas', title: 'Vacinação e Histórico', order: 2 },
    ],
    fields: [
      // Secção: Crescimento
      { label: 'Peso', type: MedicalRecordFieldType.NUMBER, required: true, sectionKey: 'crescimento', canonicalKey: 'weight', placeholder: 'kg' },
      { label: 'Altura', type: MedicalRecordFieldType.NUMBER, required: true, sectionKey: 'crescimento', canonicalKey: 'height', placeholder: 'cm' },
      { label: 'Perímetro Cefálico', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: 'crescimento', placeholder: 'cm' },
      // Secção: Vacinação
      { label: 'Caderneta de Vacinação em Dia', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'vacinas' },
      { label: 'Alergias Conhecidas', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: 'vacinas', canonicalKey: 'allergies' },
      // Standalone
      { label: 'Temperatura', type: MedicalRecordFieldType.NUMBER, required: false, sectionKey: null, canonicalKey: 'temperature', placeholder: '°C' },
      { label: 'Queixa Principal', type: MedicalRecordFieldType.TEXTAREA, required: true, sectionKey: null, canonicalKey: 'chief_complaint' },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
    ],
  },
  dermatologia: {
    sections: [
      { key: 'avaliacao_pele', title: 'Avaliação de Pele', order: 1 },
      { key: 'fototipo', title: 'Fototipo e Exposição Solar', order: 2 },
    ],
    fields: [
      // Secção: Avaliação de Pele
      { label: 'Tipo de Lesão', type: MedicalRecordFieldType.SELECT, required: false, sectionKey: 'avaliacao_pele', options: [{ value: 'macula', label: 'Mácula' }, { value: 'papula', label: 'Pápula' }, { value: 'placa', label: 'Placa' }, { value: 'nodulo', label: 'Nódulo' }, { value: 'vesicula', label: 'Vesícula' }] },
      { label: 'Localização da Lesão', type: MedicalRecordFieldType.TEXT, required: false, sectionKey: 'avaliacao_pele', placeholder: 'Ex: antebraço esquerdo' },
      { label: 'Tempo de Evolução', type: MedicalRecordFieldType.TEXT, required: false, sectionKey: 'avaliacao_pele', placeholder: 'Ex: 2 semanas' },
      // Secção: Fototipo
      { label: 'Fototipo Fitzpatrick', type: MedicalRecordFieldType.SELECT, required: false, sectionKey: 'fototipo', options: [{ value: 'I', label: 'I - Muito claro' }, { value: 'II', label: 'II - Claro' }, { value: 'III', label: 'III - Moreno claro' }, { value: 'IV', label: 'IV - Moreno moderado' }, { value: 'V', label: 'V - Moreno escuro' }, { value: 'VI', label: 'VI - Negro' }] },
      { label: 'Protetor Solar Diário', type: MedicalRecordFieldType.BOOLEAN, required: false, sectionKey: 'fototipo' },
      // Standalone
      { label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null, canonicalKey: 'allergies' },
      { label: 'Medicações em Uso', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
      { label: 'Observações', type: MedicalRecordFieldType.TEXTAREA, required: false, sectionKey: null },
    ],
  },
}

function log(msg: string) {
  console.log(`[carga-seed] ${new Date().toISOString()} ${msg}`)
}

export async function cargaSeed(dataSource: DataSource): Promise<void> {
  log('Starting carga seed...')

  const specialtyEntities = await seedSpecialties(dataSource)
  await seedClinic(dataSource, specialtyEntities)
  const adminUser = await seedAdminUser(dataSource)
  await seedCanonicalFields(dataSource)
  await seedTemplates(dataSource, specialtyEntities)
  const doctorPassword = await bcrypt.hash('carga123', 10)
  await seedDoctors(dataSource, specialtyEntities, doctorPassword)
  const patientHash = await bcrypt.hash('carga123', 10)
  await seedPatientsBulk(dataSource, patientHash)
  await seedAppointmentsBulk(dataSource)

  log('Carga seed completed.')
}

async function seedSpecialties(dataSource: DataSource): Promise<Specialty[]> {
  const repository = dataSource.getRepository(Specialty)
  const result: Specialty[] = []

  for (const spec of SPECIALTIES) {
    let entity = await repository.findOneBy({ name: spec.name })
    if (!entity) {
      entity = await repository.save(repository.create({ name: spec.name, description: null }))
      log(`Specialty "${spec.name}" created.`)
    } else {
      log(`Specialty "${spec.name}" already exists.`)
    }
    result.push(entity)
  }

  return result
}

async function seedClinic(dataSource: DataSource, specialties: Specialty[]): Promise<void> {
  const clinicRepo = dataSource.getRepository(Clinic)
  const csRepo = dataSource.getRepository(ClinicSpecialty)

  let clinic = await clinicRepo.findOneBy({ id: CARGA_CLINIC_ID })
  if (!clinic) {
    clinic = await clinicRepo
      .createQueryBuilder()
      .insert()
      .into(Clinic)
      .values({ id: CARGA_CLINIC_ID, name: 'Pulso Carga', slug: CARGA_CLINIC_SLUG, isActive: true, themeId: null })
      .returning('*')
      .execute()
      .then(() => clinicRepo.findOneByOrFail({ id: CARGA_CLINIC_ID }))
    log('Clinic "Pulso Carga" created.')
  } else {
    log('Clinic "Pulso Carga" already exists.')
  }

  for (const specialty of specialties) {
    const existing = await csRepo.findOneBy({ clinicId: CARGA_CLINIC_ID, specialtyId: specialty.id })
    if (!existing) {
      await csRepo.save(csRepo.create({ clinicId: CARGA_CLINIC_ID, specialtyId: specialty.id }))
    }
  }
  log(`${specialties.length} specialties linked to clinic.`)
}

async function seedAdminUser(dataSource: DataSource): Promise<User> {
  const repo = dataSource.getRepository(User)
  const email = 'admin@pulso-carga.center'
  let user = await repo.findOneBy({ email })
  if (!user) {
    const password = await bcrypt.hash('carga123', 10)
    user = await repo.save(repo.create({ fullName: 'Admin Carga', email, password, role: UserRole.ADMIN, clinicId: CARGA_CLINIC_ID }))
    log('Admin user created.')
  }
  return user
}

async function seedCanonicalFields(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(MedicalRecordCanonicalField)
  const fields = [
    { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER, unit: 'kg' },
    { canonicalKey: 'height', label: 'Altura', type: MedicalRecordFieldType.NUMBER, unit: 'cm' },
    { canonicalKey: 'blood_pressure', label: 'Pressão arterial', type: MedicalRecordFieldType.TEXT, unit: 'mmHg' },
    { canonicalKey: 'heart_rate', label: 'Frequência cardíaca', type: MedicalRecordFieldType.NUMBER, unit: 'bpm' },
    { canonicalKey: 'temperature', label: 'Temperatura', type: MedicalRecordFieldType.NUMBER, unit: '°C' },
    { canonicalKey: 'chief_complaint', label: 'Queixa principal', type: MedicalRecordFieldType.TEXTAREA },
    { canonicalKey: 'allergies', label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA },
    { canonicalKey: 'smoker', label: 'Fumante', type: MedicalRecordFieldType.BOOLEAN },
  ]
  for (const f of fields) {
    const existing = await repo.findOneBy({ canonicalKey: f.canonicalKey })
    if (!existing) {
      await repo.save(repo.create({ ...f, unit: f.unit ?? null, specialtyId: null, description: null, options: null }))
    }
  }
  log('Canonical fields seeded.')
}

async function seedTemplates(dataSource: DataSource, specialties: Specialty[]): Promise<void> {
  const templateRepo = dataSource.getRepository(MedicalRecordTemplate)
  const canonicalRepo = dataSource.getRepository(MedicalRecordCanonicalField)

  for (const specialty of specialties) {
    const existing = await templateRepo.findOneBy({ clinicId: CARGA_CLINIC_ID, specialtyId: specialty.id })
    if (existing) {
      log(`Template for "${specialty.name}" already exists.`)
      continue
    }

    const specKey = SPECIALTIES.find((s) => s.name === specialty.name)?.key ?? ''
    const def = TEMPLATE_DEFINITIONS[specKey]
    if (!def) continue

    const sections: MedicalRecordTemplateSection[] = def.sections
    const usedKeys = new Set<string>()
    const fields: MedicalRecordTemplateField[] = []

    for (let i = 0; i < def.fields.length; i++) {
      const f = def.fields[i]
      let canonicalKey: string | null = f.canonicalKey ?? null

      const canonical = canonicalKey ? await canonicalRepo.findOneBy({ canonicalKey }) : null

      fields.push({
        key: generateFieldKey(f.label, usedKeys),
        label: f.label,
        type: f.type,
        required: f.required,
        order: i + 1,
        options: f.options ?? null,
        placeholder: f.placeholder ?? null,
        helpText: f.helpText ?? null,
        canonical: !!canonical,
        canonicalKey: canonical ? canonical.canonicalKey : null,
        sectionKey: f.sectionKey,
      })
    }

    await templateRepo.save(templateRepo.create({
      clinicId: CARGA_CLINIC_ID,
      specialtyId: specialty.id,
      name: `Prontuário ${specialty.name}`,
      sections,
      fields,
    }))
    log(`Template for "${specialty.name}" created (${sections.length} sections, ${fields.filter(f => f.sectionKey).length} fields in sections, ${fields.filter(f => !f.sectionKey).length} standalone).`)
  }
}

const DAY_OF_WEEKS = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]
const SCHEDULE_CONFIGS = [
  { startTime: '07:00', endTime: '12:00', slot: 30 },
  { startTime: '08:00', endTime: '12:00', slot: 30 },
  { startTime: '13:00', endTime: '18:00', slot: 30 },
  { startTime: '07:00', endTime: '11:00', slot: 20 },
  { startTime: '14:00', endTime: '18:00', slot: 30 },
]

async function seedDoctors(dataSource: DataSource, specialties: Specialty[], passwordHash: string): Promise<void> {
  const userRepo = dataSource.getRepository(User)
  const doctorRepo = dataSource.getRepository(Doctor)
  const scheduleRepo = dataSource.getRepository(Schedule)

  const existing = await doctorRepo.count({ where: { clinicId: CARGA_CLINIC_ID } })
  if (existing >= TOTAL_DOCTORS) {
    log(`${existing} doctors already exist, skipping.`)
    return
  }

  const toCreate = TOTAL_DOCTORS - existing
  log(`Creating ${toCreate} doctors...`)

  const BATCH = 20
  for (let i = existing; i < TOTAL_DOCTORS; i += BATCH) {
    const batch = Math.min(BATCH, TOTAL_DOCTORS - i)
    await Promise.all(
      Array.from({ length: batch }, async (_, j) => {
        const idx = i + j + 1
        const specialtyIndex = (idx - 1) % specialties.length
        const specialty = specialties[specialtyIndex]
        const schedCfg = SCHEDULE_CONFIGS[(idx - 1) % SCHEDULE_CONFIGS.length]
        const dow = DAY_OF_WEEKS[(idx - 1) % DAY_OF_WEEKS.length]

        const email = `medico${idx}@pulso-carga.center`
        let user = await userRepo.findOneBy({ email })
        if (!user) {
          user = await userRepo.save(userRepo.create({
            fullName: `Dr. Médico Carga ${idx}`,
            email,
            password: passwordHash,
            role: UserRole.DOCTOR,
            clinicId: CARGA_CLINIC_ID,
          }))
        }

        let doctor = await doctorRepo.findOneBy({ userId: user.id })
        if (!doctor) {
          const d = doctorRepo.create({ userId: user.id, clinicId: CARGA_CLINIC_ID, crmNumber: `${100000 + idx}/SP` })
          d.specialties = [specialty]
          doctor = await doctorRepo.save(d)
        }

        const schedExists = await scheduleRepo.findOneBy({ doctorId: doctor.id })
        if (!schedExists) {
          await scheduleRepo.save(scheduleRepo.create({
            doctorId: doctor.id,
            clinicId: CARGA_CLINIC_ID,
            dayOfWeek: dow,
            startTime: schedCfg.startTime,
            endTime: schedCfg.endTime,
            slotDurationInMinutes: schedCfg.slot,
            validFrom: null,
            validUntil: null,
          }))
        }
      }),
    )
    if ((i + BATCH) % 100 === 0 || i + BATCH >= TOTAL_DOCTORS) {
      log(`  doctors progress: ${Math.min(i + BATCH, TOTAL_DOCTORS)}/${TOTAL_DOCTORS}`)
    }
  }
  log('Doctors seeded.')
}

async function seedPatientsBulk(dataSource: DataSource, passwordHash: string): Promise<void> {
  const qr = dataSource.createQueryRunner()
  await qr.connect()

  try {
    const schema = (dataSource.options as any).schema ?? 'dev'
    await qr.query(`SET search_path TO "${schema}", public`)

    const existingPatients = parseInt((await qr.query(
      `SELECT COUNT(*) as cnt FROM patients WHERE clinic_id = $1`, [CARGA_CLINIC_ID],
    ))[0].cnt, 10)

    const existingUsers = parseInt((await qr.query(
      `SELECT COUNT(*) as cnt FROM users WHERE clinic_id = $1 AND role = 'patient'`, [CARGA_CLINIC_ID],
    ))[0].cnt, 10)

    if (existingPatients >= TOTAL_PATIENTS) {
      log(`${existingPatients} patients already exist, skipping bulk insert.`)
      return
    }

    // Determine ranges to insert
    const usersToInsert = TOTAL_PATIENTS - existingUsers
    const patientsToInsert = TOTAL_PATIENTS - existingPatients
    const userStartIdx = existingUsers + 1

    log(`Inserting ${usersToInsert.toLocaleString()} patient users and ${patientsToInsert.toLocaleString()} patients...`)

    const t0 = Date.now()

    if (usersToInsert > 0) {
      await qr.query(
        `INSERT INTO users (id, full_name, email, password, role, clinic_id, version, created_at, updated_at)
         SELECT
           gen_random_uuid(),
           'Paciente ' || s,
           'paciente' || s || '@carga.test',
           $1,
           'patient',
           $2,
           1,
           NOW() - ((s % 730) * INTERVAL '1 day'),
           NOW() - ((s % 730) * INTERVAL '1 day')
         FROM generate_series($3::bigint, $4::bigint) s
         ON CONFLICT DO NOTHING`,
        [passwordHash, CARGA_CLINIC_ID, userStartIdx, TOTAL_PATIENTS],
      )
      log(`  patient users inserted in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    }

    const t1 = Date.now()
    // Insert patients linked to their respective users (matched by email)
    await qr.query(
      `INSERT INTO patients (id, user_id, clinic_id, document_number, phone_number, birth_date, gender, version, created_at, updated_at)
       SELECT
         gen_random_uuid(),
         u.id,
         $1,
         LPAD(SUBSTRING(u.email FROM 'paciente(\\d+)@')::bigint::text, 11, '0'),
         '11' || LPAD(((SUBSTRING(u.email FROM 'paciente(\\d+)@')::bigint % 900000000) + 100000000)::text, 9, '0'),
         (CURRENT_DATE - (3650 + (SUBSTRING(u.email FROM 'paciente(\\d+)@')::bigint % 25550))::int * INTERVAL '1 day')::date,
         CASE WHEN SUBSTRING(u.email FROM 'paciente(\\d+)@')::bigint % 3 = 0 THEN 'male'
              WHEN SUBSTRING(u.email FROM 'paciente(\\d+)@')::bigint % 3 = 1 THEN 'female'
              ELSE 'female' END,
         1,
         u.created_at,
         u.updated_at
       FROM users u
       WHERE u.clinic_id = $1
         AND u.role = 'patient'
         AND NOT EXISTS (
           SELECT 1 FROM patients p WHERE p.user_id = u.id
         )`,
      [CARGA_CLINIC_ID],
    )
    log(`  patients inserted in ${((Date.now() - t1) / 1000).toFixed(1)}s`)
    log(`Total patient bulk insert: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  } finally {
    await qr.release()
  }
}

async function seedAppointmentsBulk(dataSource: DataSource): Promise<void> {
  const qr = dataSource.createQueryRunner()
  await qr.connect()

  try {
    const schema = (dataSource.options as any).schema ?? 'dev'
    await qr.query(`SET search_path TO "${schema}", public`)

    const existingCount = await qr.query(
      `SELECT COUNT(*) as cnt FROM appointments WHERE clinic_id = $1`,
      [CARGA_CLINIC_ID],
    )
    const already = parseInt(existingCount[0].cnt, 10)
    if (already >= TOTAL_APPOINTMENTS) {
      log(`${already} appointments already exist, skipping.`)
      return
    }

    log(`Preparing appointment bulk insert (${TOTAL_APPOINTMENTS.toLocaleString()} rows)...`)
    const t0 = Date.now()

    // Temp table: doctors in indexed order
    await qr.query(`
      CREATE TEMP TABLE IF NOT EXISTS _carga_doctors_idx AS
      SELECT
        d.id                                                         AS doctor_id,
        s.id                                                         AS schedule_id,
        (SELECT ds.specialty_id
         FROM doctor_specialties ds
         WHERE ds.doctor_id = d.id
         LIMIT 1)                                                    AS specialty_id,
        (ROW_NUMBER() OVER (ORDER BY d.created_at, d.id))::int - 1  AS rn
      FROM doctors d
      JOIN schedules s ON s.doctor_id = d.id AND s.clinic_id = d.clinic_id
      WHERE d.clinic_id = $1
      LIMIT $2
    `, [CARGA_CLINIC_ID, TOTAL_DOCTORS])

    await qr.query(`CREATE INDEX IF NOT EXISTS _carga_doctors_idx_rn ON _carga_doctors_idx (rn)`)
    const doctorCount = parseInt((await qr.query(`SELECT COUNT(*) as cnt FROM _carga_doctors_idx`))[0].cnt, 10)
    log(`  doctor temp table ready: ${doctorCount} rows`)

    // Temp table: patients in indexed order (use document_number for stable ordering)
    log(`  building patient temp table (${TOTAL_PATIENTS.toLocaleString()} rows — may take a minute)...`)
    const t1 = Date.now()
    await qr.query(`
      CREATE TEMP TABLE IF NOT EXISTS _carga_patients_idx AS
      SELECT
        p.id                                                            AS patient_id,
        (ROW_NUMBER() OVER (ORDER BY p.document_number))::bigint - 1   AS rn
      FROM patients p
      WHERE p.clinic_id = $1
    `, [CARGA_CLINIC_ID])

    await qr.query(`CREATE INDEX IF NOT EXISTS _carga_patients_idx_rn ON _carga_patients_idx (rn)`)
    log(`  patient temp table ready in ${((Date.now() - t1) / 1000).toFixed(1)}s`)

    const toInsert = TOTAL_APPOINTMENTS - already
    log(`  inserting ${toInsert.toLocaleString()} appointments...`)
    const t2 = Date.now()

    // Slots per day and days range to guarantee uniqueness across 4M rows.
    // Using hierarchical integer division: slot → day → doctor, so that
    // every (doctor_rn, day_offset, slot_idx) triple is unique within [1, 4M].
    // Max unique slots = 200 doctors × 16 slots × 1460 days = 4,672,000 > 4,000,000.
    const SLOTS_PER_DAY = 16
    const DAYS_RANGE = 1460 // 4 years
    const SLOTS_PER_DOCTOR = SLOTS_PER_DAY * DAYS_RANGE // 23,360

    await qr.query(`
      INSERT INTO appointments
        (id, clinic_id, doctor_id, patient_id, specialty_id, schedule_id,
         date, start_time, end_time, status, insurance_type, reason, version, created_at, updated_at)
      SELECT
        gen_random_uuid(),
        $1,
        dr.doctor_id,
        pt.patient_id,
        dr.specialty_id,
        dr.schedule_id,
        (CURRENT_DATE - (((s - 1) / $6) % $7)::int * INTERVAL '1 day')::date,
        (ARRAY[
          '07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
          '11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30'
        ])[((s - 1) % $6)::int + 1],
        (ARRAY[
          '07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00',
          '11:30','12:00','13:30','14:00','14:30','15:00','15:30','16:00'
        ])[((s - 1) % $6)::int + 1],
        (ARRAY['scheduled','confirmed','completed','cancelled','no_show'])[(s % 5) + 1],
        CASE WHEN s % 3 = 0 THEN 'particular' WHEN s % 3 = 1 THEN 'convenio' ELSE NULL END,
        'Consulta de rotina - carga ' || s,
        1,
        NOW() - (((s - 1) / $6) % $7)::int * INTERVAL '1 day',
        NOW() - (((s - 1) / $6) % $7)::int * INTERVAL '1 day'
      FROM generate_series($2::bigint, $3::bigint) s
      JOIN _carga_doctors_idx dr ON dr.rn = (((s - 1) / $8) % $4)::int
      JOIN _carga_patients_idx pt ON pt.rn = ((s - 1) % $5)
    `, [
      CARGA_CLINIC_ID,
      already + 1,
      TOTAL_APPOINTMENTS,
      doctorCount,
      TOTAL_PATIENTS,
      SLOTS_PER_DAY,
      DAYS_RANGE,
      SLOTS_PER_DOCTOR,
    ])

    log(`  appointments inserted in ${((Date.now() - t2) / 1000).toFixed(1)}s`)

    // Cleanup
    await qr.query(`DROP TABLE IF EXISTS _carga_doctors_idx`)
    await qr.query(`DROP TABLE IF EXISTS _carga_patients_idx`)

    log(`Total appointment bulk insert: ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  } finally {
    await qr.release()
  }
}
