import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientGender } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ResumoTab } from './resumo-tab'
import type { IAppointmentPatientModel } from '../types/appointment-model.types'

function makePatient(overrides: Partial<IAppointmentPatientModel> = {}): IAppointmentPatientModel {
  return {
    fullName: 'Maria Santos',
    email: 'maria@example.com',
    phoneNumber: '11912345678',
    birthDate: new Date('1990-01-15'),
    documentNumber: '12345678901',
    gender: PatientGender.FEMALE,
    ...overrides,
  }
}

const defaultProps = {
  patient: makePatient(),
  patientId: 'patient-uuid',
  prescriptionCount: 2,
  showPrescriptions: true,
  certificateCount: 1,
  showCertificates: true,
  examCount: 1,
  showExames: true,
  photoCount: 1,
  showPhotos: true,
  onNavigate: jest.fn(),
}

describe('ResumoTab', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders patient data fields', () => {
    renderWithProviders(<ResumoTab {...defaultProps} />)
    expect(screen.getByTestId('patient-info-name')).toHaveTextContent('Maria Santos')
    expect(screen.getByTestId('patient-info-email')).toHaveTextContent('maria@example.com')
    expect(screen.getByTestId('patient-info-gender')).toHaveTextContent('Feminino')
  })

  it('formats the CPF when the patient has one', () => {
    renderWithProviders(<ResumoTab {...defaultProps} />)
    expect(screen.getByTestId('patient-info-cpf')).toHaveTextContent('123.456.789-01')
  })

  // A dependent may legitimately have no CPF. Rendering the label with nothing
  // beside it reads as a loading failure; the patient page says "Não informado".
  it('says "Não informado" for a patient without a CPF', () => {
    renderWithProviders(
      <ResumoTab {...defaultProps} patient={makePatient({ documentNumber: null })} />,
    )
    expect(screen.getByTestId('patient-info-cpf')).toHaveTextContent('Não informado')
  })

  it('falls back to the raw gender value when it has no known label', () => {
    renderWithProviders(
      <ResumoTab {...defaultProps} patient={makePatient({ gender: 'unknown' as PatientGender })} />,
    )
    expect(screen.getByTestId('patient-info-gender')).toHaveTextContent('unknown')
  })

  it('falls back to 0 for prescriptionCount when undefined', () => {
    renderWithProviders(<ResumoTab {...defaultProps} prescriptionCount={undefined} />)
    expect(screen.getByTestId('resumo-tab-prescriptions-count')).toHaveTextContent('0')
  })

  it('falls back to 0 for certificateCount when undefined', () => {
    renderWithProviders(<ResumoTab {...defaultProps} certificateCount={undefined} />)
    expect(screen.getByTestId('resumo-tab-atestados-count')).toHaveTextContent('0')
  })

  it('renders prescription count when showPrescriptions is true', () => {
    renderWithProviders(<ResumoTab {...defaultProps} prescriptionCount={3} />)
    expect(screen.getByTestId('resumo-tab-prescriptions')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-prescriptions-count')).toHaveTextContent('3')
  })

  it('hides prescription row when showPrescriptions is false', () => {
    renderWithProviders(<ResumoTab {...defaultProps} showPrescriptions={false} />)
    expect(screen.queryByTestId('resumo-tab-prescriptions')).not.toBeInTheDocument()
  })

  it('renders atestados row with certificateCount when showCertificates is true', () => {
    renderWithProviders(<ResumoTab {...defaultProps} certificateCount={3} />)
    expect(screen.getByTestId('resumo-tab-atestados')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-atestados-count')).toHaveTextContent('3')
  })

  it('hides atestados row when showCertificates is false', () => {
    renderWithProviders(<ResumoTab {...defaultProps} showCertificates={false} />)
    expect(screen.queryByTestId('resumo-tab-atestados')).not.toBeInTheDocument()
  })

  it('falls back to 0 for examCount when undefined', () => {
    renderWithProviders(<ResumoTab {...defaultProps} examCount={undefined} />)
    expect(screen.getByTestId('resumo-tab-exames-count')).toHaveTextContent('0')
  })

  it('renders exames row with examCount when showExames is true', () => {
    renderWithProviders(<ResumoTab {...defaultProps} examCount={3} />)
    expect(screen.getByTestId('resumo-tab-exames')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-exames-count')).toHaveTextContent('3')
  })

  it('hides exames row when showExames is false', () => {
    renderWithProviders(<ResumoTab {...defaultProps} showExames={false} />)
    expect(screen.queryByTestId('resumo-tab-exames')).not.toBeInTheDocument()
  })

  it('falls back to 0 for photoCount when undefined', () => {
    renderWithProviders(<ResumoTab {...defaultProps} photoCount={undefined} />)
    expect(screen.getByTestId('resumo-tab-fotos-count')).toHaveTextContent('0')
  })

  it('renders fotos row with photoCount when showPhotos is true', () => {
    renderWithProviders(<ResumoTab {...defaultProps} photoCount={5} />)
    expect(screen.getByTestId('resumo-tab-fotos')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-fotos-count')).toHaveTextContent('5')
  })

  it('hides fotos row when showPhotos is false', () => {
    renderWithProviders(<ResumoTab {...defaultProps} showPhotos={false} />)
    expect(screen.queryByTestId('resumo-tab-fotos')).not.toBeInTheDocument()
  })

  it('calls onNavigate with fotos when fotos row clicked', async () => {
    const onNavigate = jest.fn()
    renderWithProviders(<ResumoTab {...defaultProps} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByTestId('resumo-tab-fotos'))
    expect(onNavigate).toHaveBeenCalledWith('fotos')
  })

  it('calls onNavigate with receitas when prescription row clicked', async () => {
    const onNavigate = jest.fn()
    renderWithProviders(<ResumoTab {...defaultProps} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByTestId('resumo-tab-prescriptions'))
    expect(onNavigate).toHaveBeenCalledWith('receitas')
  })

  it('calls onNavigate with atestados when atestados row clicked', async () => {
    const onNavigate = jest.fn()
    renderWithProviders(<ResumoTab {...defaultProps} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByTestId('resumo-tab-atestados'))
    expect(onNavigate).toHaveBeenCalledWith('atestados')
  })

  it('calls onNavigate with exames when exames row clicked', async () => {
    const onNavigate = jest.fn()
    renderWithProviders(<ResumoTab {...defaultProps} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByTestId('resumo-tab-exames'))
    expect(onNavigate).toHaveBeenCalledWith('exames')
  })

  // O profissional não acessa a lista de pacientes, onde este mesmo link existe
  // para ADMIN e recepção. Aqui é a única porta dele para o histórico.
  it('links to the appointment history of this patient', () => {
    renderWithProviders(<ResumoTab {...defaultProps} />)

    const link = screen.getByTestId('resumo-tab-patient-appointments-link')
    expect(link).toHaveAttribute('href', expect.stringContaining('/patients/patient-uuid/appointments'))
  })
})