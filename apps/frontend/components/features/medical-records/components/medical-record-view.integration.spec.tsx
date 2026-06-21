import { render, screen } from '@testing-library/react'
import { MedicalRecordFieldType } from '@app/shared'
import { MedicalRecordView } from './medical-record-view'
import type { IMedicalRecordModel, IRecordFieldModel } from '../types/medical-record-model.types'

function makeField(overrides: Partial<IRecordFieldModel> = {}): IRecordFieldModel {
  return {
    key: 'symptom',
    label: 'Sintoma',
    type: MedicalRecordFieldType.TEXT,
    required: false,
    order: 0,
    options: null,
    placeholder: null,
    helpText: null,
    ...overrides,
  }
}

function makeRecord(overrides: Partial<IMedicalRecordModel> = {}): IMedicalRecordModel {
  return {
    id: 'uuid-1',
    appointmentId: 'appt-uuid',
    patientId: 'patient-uuid',
    patientName: 'Ana Lima',
    doctorId: 'doctor-uuid',
    doctorName: 'Dr. João',
    specialtyId: 'spec-uuid',
    specialtyName: 'Cardiologia',
    schema: [makeField()],
    data: { symptom: 'Dor no peito' },
    notes: null,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    ...overrides,
  }
}

describe('MedicalRecordView', () => {
  it('renders patient name', () => {
    render(<MedicalRecordView record={makeRecord()} />)
    expect(screen.getByTestId('record-patient-name')).toHaveTextContent('Ana Lima')
  })

  it('renders doctor name', () => {
    render(<MedicalRecordView record={makeRecord()} />)
    expect(screen.getByTestId('record-doctor-name')).toHaveTextContent('Dr. João')
  })

  it('renders specialty name', () => {
    render(<MedicalRecordView record={makeRecord()} />)
    expect(screen.getByTestId('record-specialty-name')).toHaveTextContent('Cardiologia')
  })

  it('renders field labels and values from schema in order', () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'k1', label: 'Sintoma', order: 0 }),
        makeField({ key: 'k2', label: 'Duração', order: 1 }),
      ],
      data: { k1: 'Febre', k2: '3 dias' },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-k1')).toHaveTextContent('Sintoma')
    expect(screen.getByTestId('record-field-k1')).toHaveTextContent('Febre')
    expect(screen.getByTestId('record-field-k2')).toHaveTextContent('Duração')
    expect(screen.getByTestId('record-field-k2')).toHaveTextContent('3 dias')
  })

  it('shows — for empty field value', () => {
    const record = makeRecord({ data: {} })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-symptom')).toHaveTextContent('—')
  })

  it('renders boolean field as Sim/Não', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'diabetic', label: 'Diabético', type: MedicalRecordFieldType.BOOLEAN })],
      data: { diabetic: true },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-diabetic')).toHaveTextContent('Sim')
  })

  it('renders multiselect as comma-separated string', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'allergies', label: 'Alergias', type: MedicalRecordFieldType.MULTISELECT })],
      data: { allergies: ['penicilina', 'dipirona'] },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-allergies')).toHaveTextContent('penicilina, dipirona')
  })

  it('renders notes when present', () => {
    render(<MedicalRecordView record={makeRecord({ notes: 'Paciente estável' })} />)
    expect(screen.getByTestId('record-notes')).toHaveTextContent('Paciente estável')
  })

  it('does not render notes section when notes is null', () => {
    render(<MedicalRecordView record={makeRecord({ notes: null })} />)
    expect(screen.queryByTestId('record-notes')).not.toBeInTheDocument()
  })
})
