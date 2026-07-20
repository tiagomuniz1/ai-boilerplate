import { MedicalRecordFieldOptionDto, MedicalRecordFieldType } from '@app/shared'

// Canonical platform catalogue of medical-record fields (managed by PLATFORM_ADMIN).
// Single source of truth shared by the dev seed and the importer
// (run-import-canonical-fields) so both stay in sync.
//
// Specialty-scoped fields reference the specialty by NAME (not id): specialty ids
// differ per environment, so the importer resolves the name against the target
// database at run time. `specialtyName` undefined = general field (specialtyId null).
export interface CanonicalFieldSeed {
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  unit?: string | null
  options?: MedicalRecordFieldOptionDto[] | null
  description?: string | null
  specialtyName?: string
}

export const CANONICAL_FIELDS: CanonicalFieldSeed[] = [
  { canonicalKey: 'weight', label: 'Peso', type: MedicalRecordFieldType.NUMBER, unit: 'kg' },
  { canonicalKey: 'height', label: 'Altura', type: MedicalRecordFieldType.NUMBER, unit: 'cm' },
  { canonicalKey: 'blood_pressure', label: 'Pressão arterial', type: MedicalRecordFieldType.TEXT, unit: 'mmHg' },
  { canonicalKey: 'heart_rate', label: 'Frequência cardíaca', type: MedicalRecordFieldType.NUMBER, unit: 'bpm' },
  { canonicalKey: 'temperature', label: 'Temperatura', type: MedicalRecordFieldType.NUMBER, unit: '°C' },
  { canonicalKey: 'chief_complaint', label: 'Queixa principal', type: MedicalRecordFieldType.TEXTAREA },
  { canonicalKey: 'allergies', label: 'Alergias', type: MedicalRecordFieldType.TEXTAREA },
  { canonicalKey: 'smoker', label: 'Fumante', type: MedicalRecordFieldType.BOOLEAN },
  {
    canonicalKey: 'risk_level',
    label: 'Nível de risco',
    type: MedicalRecordFieldType.SELECT,
    specialtyName: 'Cardiologia',
    options: [
      { value: 'low', label: 'Baixo' },
      { value: 'moderate', label: 'Moderado' },
      { value: 'high', label: 'Alto' },
    ],
  },
  {
    canonicalKey: 'bmi',
    label: 'IMC',
    type: MedicalRecordFieldType.NUMBER,
    unit: 'kg/m²',
    specialtyName: 'Nutrição Clínica',
  },
  {
    canonicalKey: 'waist_circumference',
    label: 'Circunferência abdominal',
    type: MedicalRecordFieldType.NUMBER,
    unit: 'cm',
    specialtyName: 'Nutrição Clínica',
  },
  {
    canonicalKey: 'range_of_motion',
    label: 'Amplitude de movimento',
    type: MedicalRecordFieldType.TEXT,
    specialtyName: 'Fisioterapia Ortopédica',
  },
]
