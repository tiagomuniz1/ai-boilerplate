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
  prescriptionCount: 2,
  showPrescriptions: true,
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

  it('renders prescription count when showPrescriptions is true', () => {
    renderWithProviders(<ResumoTab {...defaultProps} prescriptionCount={3} />)
    expect(screen.getByTestId('resumo-tab-prescriptions')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-prescriptions-count')).toHaveTextContent('3')
  })

  it('hides prescription row when showPrescriptions is false', () => {
    renderWithProviders(<ResumoTab {...defaultProps} showPrescriptions={false} />)
    expect(screen.queryByTestId('resumo-tab-prescriptions')).not.toBeInTheDocument()
  })

  it('renders atestados and exames rows with count 0', () => {
    renderWithProviders(<ResumoTab {...defaultProps} />)
    expect(screen.getByTestId('resumo-tab-atestados')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-atestados-count')).toHaveTextContent('0')
    expect(screen.getByTestId('resumo-tab-exames')).toBeInTheDocument()
    expect(screen.getByTestId('resumo-tab-exames-count')).toHaveTextContent('0')
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
})
