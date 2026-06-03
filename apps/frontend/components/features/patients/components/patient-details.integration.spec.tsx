jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/patients.service')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { PatientGender } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { PatientDetails } from './patient-details'
import type { IPatientModel } from '../types/patient-model.types'

const mockPush = jest.fn()

const patient: IPatientModel = {
  id: 'uuid-1',
  fullName: 'João Silva',
  email: 'joao@example.com',
  phoneNumber: '11999999999',
  birthDate: new Date('1990-05-15'),
  documentNumber: '12345678901',
  gender: PatientGender.MALE,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('PatientDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all patient fields', () => {
    renderWithProviders(<PatientDetails patient={patient} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-name')).toHaveTextContent('João Silva')
    expect(screen.getByTestId('patient-details-email')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('patient-details-phone')).toHaveTextContent('(11) 99999-9999')
    expect(screen.getByTestId('patient-details-document')).toHaveTextContent('123.456.789-01')
    expect(screen.getByTestId('patient-details-gender')).toHaveTextContent('Masculino')
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<PatientDetails patient={patient} onDeleteClick={jest.fn()} />)

    const editButton = screen.getByTestId('patient-details-edit-button')
    expect(editButton).toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<PatientDetails patient={patient} onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('patient-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })

  it('renders birthdate formatted', () => {
    renderWithProviders(<PatientDetails patient={patient} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-birthdate')).toBeInTheDocument()
  })

  it('renders gender "Feminino" for female patient', () => {
    renderWithProviders(
      <PatientDetails
        patient={{ ...patient, gender: PatientGender.FEMALE }}
        onDeleteClick={jest.fn()}
      />,
    )

    expect(screen.getByTestId('patient-details-gender')).toHaveTextContent('Feminino')
  })
})
