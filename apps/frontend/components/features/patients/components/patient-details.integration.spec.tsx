jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/patients.service')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { KinshipType, PatientGender } from '@app/shared'
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
  responsiblePatientId: null,
  kinshipType: null,
  responsiblePatient: null,
  dependents: [],
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('PatientDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all patient fields', () => {
    renderWithProviders(<PatientDetails patient={patient} canManage onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-name')).toHaveTextContent('João Silva')
    expect(screen.getByTestId('patient-details-email')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('patient-details-phone')).toHaveTextContent('(11) 99999-9999')
    expect(screen.getByTestId('patient-details-document')).toHaveTextContent('123.456.789-01')
    expect(screen.getByTestId('patient-details-gender')).toHaveTextContent('Masculino')
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<PatientDetails patient={patient} canManage onDeleteClick={jest.fn()} />)

    const editButton = screen.getByTestId('patient-details-edit-button')
    expect(editButton).toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<PatientDetails patient={patient} canManage onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('patient-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })

  it('renders birthdate formatted', () => {
    renderWithProviders(<PatientDetails patient={patient} canManage onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-birthdate')).toBeInTheDocument()
  })

  it('renders gender "Feminino" for female patient', () => {
    renderWithProviders(
      <PatientDetails
        patient={{ ...patient, gender: PatientGender.FEMALE }}
        canManage onDeleteClick={jest.fn()}
      />,
    )

    expect(screen.getByTestId('patient-details-gender')).toHaveTextContent('Feminino')
  })

  it('shows "Não informado" when documentNumber is null', () => {
    renderWithProviders(
      <PatientDetails patient={{ ...patient, documentNumber: null }} canManage onDeleteClick={jest.fn()} />,
    )

    expect(screen.getByTestId('patient-details-document')).toHaveTextContent('Não informado')
  })

  it('does not render "Vinculado a" or "Dependentes" sections for a standalone patient', () => {
    renderWithProviders(<PatientDetails patient={patient} canManage onDeleteClick={jest.fn()} />)

    expect(screen.queryByTestId('patient-details-responsible')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-details-dependents')).not.toBeInTheDocument()
  })

  it('renders "Vinculado a" section with titular name, kinship and link for a dependent patient', () => {
    const dependent: IPatientModel = {
      ...patient,
      documentNumber: null,
      responsiblePatientId: 'titular-uuid',
      kinshipType: KinshipType.FILHO,
      responsiblePatient: { id: 'titular-uuid', fullName: 'Maria Silva', documentNumber: '11122233344' },
    }

    renderWithProviders(<PatientDetails patient={dependent} canManage onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-responsible')).toHaveTextContent('Maria Silva')
    expect(screen.getByTestId('patient-details-responsible')).toHaveTextContent('Filho(a)')
    expect(screen.getByTestId('patient-details-responsible-link')).toHaveAttribute(
      'href',
      expect.stringContaining('/patients/titular-uuid'),
    )
  })

  it('renders "Dependentes" section listing each dependent with kinship and link for a titular patient', () => {
    const titular: IPatientModel = {
      ...patient,
      dependents: [
        { id: 'dependent-1', fullName: 'Bebê Silva', kinshipType: KinshipType.FILHO },
        { id: 'dependent-2', fullName: 'Ana Silva', kinshipType: KinshipType.CONJUGE },
      ],
    }

    renderWithProviders(<PatientDetails patient={titular} canManage onDeleteClick={jest.fn()} />)

    const section = screen.getByTestId('patient-details-dependents')
    expect(section).toHaveTextContent('Bebê Silva')
    expect(section).toHaveTextContent('Filho(a)')
    expect(section).toHaveTextContent('Ana Silva')
    expect(section).toHaveTextContent('Cônjuge')

    const links = screen.getAllByTestId('patient-details-dependent-link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/patients/dependent-1'))
    expect(links[1]).toHaveAttribute('href', expect.stringContaining('/patients/dependent-2'))
  })

  // A recepcionista tem a lista de pacientes no menu por desenho, mas criar,
  // editar e excluir são exclusivos do ADMIN (patients.controller.ts:24,52,62).
  // A tela oferecia os três e cada clique dela terminava em 403.
  it('hides edit and delete when the viewer cannot manage patients', () => {
    renderWithProviders(<PatientDetails patient={patient} canManage={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('patient-details-name')).toBeInTheDocument()
    expect(screen.queryByTestId('patient-details-edit-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('patient-details-delete-button')).not.toBeInTheDocument()
  })
})