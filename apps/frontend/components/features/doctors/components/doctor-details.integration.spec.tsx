jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/doctors.service')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorDetails } from './doctor-details'
import type { IDoctorModel } from '../types/doctor-model.types'

const mockPush = jest.fn()

const doctor: IDoctorModel = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  crms: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', rqe: '6789' }],
  bio: 'Especialista em cardiologia.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('DoctorDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all doctor fields', () => {
    renderWithProviders(<DoctorDetails doctor={doctor} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('doctor-details-name')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('doctor-details-email')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('doctor-details-crm')).toHaveTextContent('12345/SP')
    expect(screen.getByTestId('doctor-details-specialties')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-details-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
  })

  it('renders all specialties as badges', () => {
    const multiSpecialtyDoctor: IDoctorModel = {
      ...doctor,
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
        { id: 'spec-uuid-3', name: 'Ortopedia' },
      ],
    }

    renderWithProviders(<DoctorDetails doctor={multiSpecialtyDoctor} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('doctor-details-specialties')).toBeInTheDocument()
    expect(screen.getByTestId('doctor-details-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('doctor-details-specialty-badge-spec-uuid-2')).toHaveTextContent('Neurologia')
    expect(screen.getByTestId('doctor-details-specialty-badge-spec-uuid-3')).toHaveTextContent('Ortopedia')
  })

  it('renders empty specialties container when no specialties', () => {
    renderWithProviders(
      <DoctorDetails doctor={{ ...doctor, specialties: [] }} onDeleteClick={jest.fn()} />,
    )

    expect(screen.getByTestId('doctor-details-specialties')).toBeInTheDocument()
    expect(screen.queryByTestId(/doctor-details-specialty-badge-/)).not.toBeInTheDocument()
  })

  it('renders bio when set', () => {
    renderWithProviders(<DoctorDetails doctor={doctor} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('doctor-details-bio')).toHaveTextContent('Especialista em cardiologia.')
  })

  it('does not render bio when null', () => {
    renderWithProviders(
      <DoctorDetails doctor={{ ...doctor, bio: null }} onDeleteClick={jest.fn()} />,
    )

    expect(screen.queryByTestId('doctor-details-bio')).not.toBeInTheDocument()
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<DoctorDetails doctor={doctor} onDeleteClick={jest.fn()} />)

    const editButton = screen.getByTestId('doctor-details-edit-button')
    expect(editButton).toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<DoctorDetails doctor={doctor} onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('doctor-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })

  it('renders createdAt formatted', () => {
    renderWithProviders(<DoctorDetails doctor={doctor} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('doctor-details-created-at')).toBeInTheDocument()
  })
})
