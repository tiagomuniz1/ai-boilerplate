import { screen } from '@testing-library/react'
import { PatientGender } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientInfoCard } from './patient-info-card'
import type { IAppointmentPatientModel } from '../types/appointment-model.types'

const makePatient = (overrides: Partial<IAppointmentPatientModel> = {}): IAppointmentPatientModel => ({
  fullName: 'Maria Silva',
  email: 'maria@example.com',
  phoneNumber: '11999990001',
  birthDate: new Date('1985-03-20T00:00:00'),
  documentNumber: '98765432100',
  gender: PatientGender.FEMALE,
  ...overrides,
})

describe('PatientInfoCard (integration)', () => {
  it('renders the patient section', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient()} />)
    expect(screen.getByTestId('patient-info-card')).toBeInTheDocument()
  })

  it('displays fullName', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient()} />)
    expect(screen.getByTestId('patient-info-name')).toHaveTextContent('Maria Silva')
  })

  it('displays email', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient()} />)
    expect(screen.getByTestId('patient-info-email')).toHaveTextContent('maria@example.com')
  })

  it('displays formatted phone number', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient({ phoneNumber: '11999990001' })} />)
    expect(screen.getByTestId('patient-info-phone')).toHaveTextContent('(11) 99999-0001')
  })

  it('displays birth date in pt-BR format', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient()} />)
    expect(screen.getByTestId('patient-info-birthdate')).toHaveTextContent('1985')
  })

  it('displays formatted CPF', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient({ documentNumber: '98765432100' })} />)
    expect(screen.getByTestId('patient-info-cpf')).toHaveTextContent('987.654.321-00')
  })

  it('displays gender label for FEMALE', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient({ gender: PatientGender.FEMALE })} />)
    expect(screen.getByTestId('patient-info-gender')).toHaveTextContent('Feminino')
  })

  it('displays gender label for MALE', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient({ gender: PatientGender.MALE })} />)
    expect(screen.getByTestId('patient-info-gender')).toHaveTextContent('Masculino')
  })

  it('displays gender label for OTHER', () => {
    renderWithProviders(<PatientInfoCard patient={makePatient({ gender: PatientGender.OTHER })} />)
    expect(screen.getByTestId('patient-info-gender')).toHaveTextContent('Outro')
  })
})
