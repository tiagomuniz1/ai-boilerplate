import { MedicalRecordFieldOptionDto, MedicalRecordFieldType } from '@app/shared'

// Canonical platform catalogue of medical-record fields (managed by PLATFORM_ADMIN).
// Single source of truth shared by the dev seed and the importer
// (run-import-canonical-fields) so both stay in sync.
//
// The catalogue is global: every field is offered to every professional. It used
// to carry a specialty scope, which could only ever narrow the picker wrongly —
// templates are scoped by specialty OR by profession, while a field could only be
// scoped by specialty, so the entries written for nutrition and physiotherapy
// named specialties the catalogue does not define and were dropped on import.
export interface CanonicalFieldSeed {
  canonicalKey: string
  label: string
  type: MedicalRecordFieldType
  unit?: string | null
  options?: MedicalRecordFieldOptionDto[] | null
  description?: string | null
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
  },
  {
    canonicalKey: 'waist_circumference',
    label: 'Circunferência abdominal',
    type: MedicalRecordFieldType.NUMBER,
    unit: 'cm',
  },
  {
    canonicalKey: 'range_of_motion',
    label: 'Amplitude de movimento',
    type: MedicalRecordFieldType.TEXT,
  },
]
