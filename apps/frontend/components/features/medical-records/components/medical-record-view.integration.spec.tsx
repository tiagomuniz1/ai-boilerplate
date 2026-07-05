import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    sectionKey: null,
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

const twoSections = [
  { key: 'vitals', title: 'Sinais Vitais', order: 0 },
  { key: 'history', title: 'Histórico Clínico', order: 1 },
]

describe('MedicalRecordView', () => {
  // --- header ---

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

  // --- flat layout (no sections) ---

  it('renders field labels and values in flat layout', () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'k1', label: 'Sintoma' }),
        makeField({ key: 'k2', label: 'Duração' }),
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
    render(<MedicalRecordView record={makeRecord({ data: {} })} />)
    expect(screen.getByTestId('record-field-symptom')).toHaveTextContent('—')
  })

  it('spans two columns for TEXTAREA fields', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'notes_field', type: MedicalRecordFieldType.TEXTAREA })],
      data: { notes_field: 'x' },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-notes_field')).toHaveClass('sm:col-span-2')
  })

  it('spans two columns for long text values', () => {
    const longValue = 'x'.repeat(61)
    const record = makeRecord({ data: { symptom: longValue } })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-symptom')).toHaveClass('sm:col-span-2')
  })

  it('does not span two columns for short text values', () => {
    const record = makeRecord({ data: { symptom: 'curto' } })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-symptom')).not.toHaveClass('sm:col-span-2')
  })

  it('renders boolean field as Sim', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'diabetic', type: MedicalRecordFieldType.BOOLEAN })],
      data: { diabetic: true },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-diabetic')).toHaveTextContent('Sim')
  })

  it('renders boolean false as Não', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'diabetic', type: MedicalRecordFieldType.BOOLEAN })],
      data: { diabetic: false },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-diabetic')).toHaveTextContent('Não')
  })

  it('renders multiselect as comma-separated string', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'allergies', type: MedicalRecordFieldType.MULTISELECT })],
      data: { allergies: ['penicilina', 'dipirona'] },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-allergies')).toHaveTextContent('penicilina, dipirona')
  })

  it('renders multiselect non-array as string', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'allergies', type: MedicalRecordFieldType.MULTISELECT })],
      data: { allergies: 'penicilina' },
    })
    render(<MedicalRecordView record={record} />)
    expect(screen.getByTestId('record-field-allergies')).toHaveTextContent('penicilina')
  })

  it('renders notes in flat layout when present', () => {
    render(<MedicalRecordView record={makeRecord({ notes: 'Paciente estável' })} />)
    expect(screen.getByTestId('record-notes')).toHaveTextContent('Paciente estável')
  })

  it('does not render notes in flat layout when null', () => {
    render(<MedicalRecordView record={makeRecord({ notes: null })} />)
    expect(screen.queryByTestId('record-notes')).not.toBeInTheDocument()
  })

  it('does not render tabs in flat layout', () => {
    render(<MedicalRecordView record={makeRecord()} />)
    expect(screen.queryByTestId('medical-record-view-tabs')).not.toBeInTheDocument()
  })

  // --- tabbed layout (with sections) ---

  it('renders tabs when sections are provided', () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'f1', sectionKey: 'vitals' }),
        makeField({ key: 'f2', sectionKey: 'history' }),
      ],
      data: { f1: '120/80', f2: 'HAS' },
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    expect(screen.getByTestId('medical-record-view-tabs')).toBeInTheDocument()
    expect(screen.getByTestId('tab-vitals')).toBeInTheDocument()
    expect(screen.getByTestId('tab-history')).toBeInTheDocument()
  })

  it('shows first section fields by default', () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'f1', sectionKey: 'vitals' }),
        makeField({ key: 'f2', sectionKey: 'history' }),
      ],
      data: { f1: '120/80', f2: 'HAS' },
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    expect(screen.getByTestId('record-field-f1')).toBeInTheDocument()
    expect(screen.queryByTestId('record-field-f2')).not.toBeInTheDocument()
  })

  it('switching tab shows that section fields', async () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'f1', sectionKey: 'vitals' }),
        makeField({ key: 'f2', sectionKey: 'history' }),
      ],
      data: { f1: '120/80', f2: 'HAS' },
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    await userEvent.click(screen.getByTestId('tab-history'))
    expect(screen.queryByTestId('record-field-f1')).not.toBeInTheDocument()
    expect(screen.getByTestId('record-field-f2')).toBeInTheDocument()
  })

  it('shows Notas tab when record has notes', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'f1', sectionKey: 'vitals' })],
      data: { f1: '120/80' },
      notes: 'Observação importante',
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    expect(screen.getByTestId('tab-__notes__')).toBeInTheDocument()
  })

  it('does not show Notas tab when record has no notes', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'f1', sectionKey: 'vitals' })],
      data: { f1: '120/80' },
      notes: null,
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    expect(screen.queryByTestId('tab-__notes__')).not.toBeInTheDocument()
  })

  it('clicking Notas tab shows notes content', async () => {
    const record = makeRecord({
      schema: [makeField({ key: 'f1', sectionKey: 'vitals' })],
      data: { f1: '120/80' },
      notes: 'Paciente estável',
    })
    render(<MedicalRecordView record={record} sections={twoSections} />)
    await userEvent.click(screen.getByTestId('tab-__notes__'))
    expect(screen.getByTestId('record-notes')).toHaveTextContent('Paciente estável')
  })

  it('shows Geral tab when unsectioned fields exist alongside sections', () => {
    const record = makeRecord({
      schema: [
        makeField({ key: 'f1', sectionKey: null }),
        makeField({ key: 'f2', sectionKey: 'vitals' }),
      ],
      data: { f1: 'A', f2: 'B' },
    })
    render(<MedicalRecordView record={record} sections={[{ key: 'vitals', title: 'Sinais Vitais', order: 0 }]} />)
    expect(screen.getByTestId('tab-__general__')).toBeInTheDocument()
    expect(screen.getByTestId('record-field-f1')).toBeInTheDocument()
  })

  it('defaults to Notas tab when every section is empty and there are no unsectioned fields', () => {
    const record = makeRecord({ schema: [], notes: 'Observação geral' })
    render(
      <MedicalRecordView record={record} sections={[{ key: 'empty', title: 'Vazio', order: 0 }]} />,
    )
    expect(screen.queryByTestId('tab-empty')).not.toBeInTheDocument()
    expect(screen.getByTestId('record-notes')).toHaveTextContent('Observação geral')
  })

  it('does not crash when sections arrive after mount (template query resolving later than the record)', async () => {
    // Reproduces the real MedicalRecordSection flow: the record loads first, so
    // MedicalRecordView first mounts with sections=[] (flat layout, activeTab='all'),
    // then the template query resolves and the parent re-renders with real sections.
    const record = makeRecord({
      schema: [
        makeField({ key: 'f1', sectionKey: 'vitals' }),
        makeField({ key: 'f2', sectionKey: 'history' }),
      ],
      data: { f1: '120/80', f2: 'HAS' },
    })

    const { rerender } = render(<MedicalRecordView record={record} sections={[]} />)
    expect(screen.queryByTestId('medical-record-view-tabs')).not.toBeInTheDocument()

    rerender(<MedicalRecordView record={record} sections={twoSections} />)

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view-tabs')).toBeInTheDocument()
    })
    expect(screen.getByTestId('record-field-f1')).toBeInTheDocument()
  })

  it('skips sections with no fields', () => {
    const record = makeRecord({
      schema: [makeField({ key: 'f1', sectionKey: 'vitals' })],
      data: { f1: '120/80' },
    })
    render(
      <MedicalRecordView
        record={record}
        sections={[
          { key: 'vitals', title: 'Sinais Vitais', order: 0 },
          { key: 'empty', title: 'Vazio', order: 1 },
        ]}
      />,
    )
    expect(screen.queryByTestId('tab-empty')).not.toBeInTheDocument()
  })
})
