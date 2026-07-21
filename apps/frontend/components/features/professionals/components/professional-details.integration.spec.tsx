jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/professionals.service')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ProfessionalDetails } from './professional-details'
import type { IProfessionalModel } from '../types/professional-model.types'

const mockPush = jest.fn()

const professional: IProfessionalModel = {
  id: 'uuid-1',
  user: { id: 'user-uuid-1', fullName: 'Dr. João Silva', email: 'joao@example.com', isActive: true },
  registrations: [{ id: 'crm-uuid-1', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [{ id: 'spec-uuid-1', name: 'Cardiologia', registryNumber: '6789' }],
  bio: 'Especialista em cardiologia.',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('ProfessionalDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all professional fields', () => {
    renderWithProviders(<ProfessionalDetails professional={professional} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('professional-details-name')).toHaveTextContent('Dr. João Silva')
    expect(screen.getByTestId('professional-details-email')).toHaveTextContent('joao@example.com')
    expect(screen.getByTestId('professional-details-crm')).toHaveTextContent('12345/SP')
    expect(screen.getByTestId('professional-details-specialties')).toBeInTheDocument()
    expect(screen.getByTestId('professional-details-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
  })

  it('renders all specialties as badges', () => {
    const multiSpecialtyProfessional: IProfessionalModel = {
      ...professional,
      specialties: [
        { id: 'spec-uuid-1', name: 'Cardiologia' },
        { id: 'spec-uuid-2', name: 'Neurologia' },
        { id: 'spec-uuid-3', name: 'Ortopedia' },
      ],
    }

    renderWithProviders(<ProfessionalDetails professional={multiSpecialtyProfessional} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('professional-details-specialties')).toBeInTheDocument()
    expect(screen.getByTestId('professional-details-specialty-badge-spec-uuid-1')).toHaveTextContent('Cardiologia')
    expect(screen.getByTestId('professional-details-specialty-badge-spec-uuid-2')).toHaveTextContent('Neurologia')
    expect(screen.getByTestId('professional-details-specialty-badge-spec-uuid-3')).toHaveTextContent('Ortopedia')
  })

  it('renders empty specialties container when no specialties', () => {
    renderWithProviders(
      <ProfessionalDetails professional={{ ...professional, specialties: [] }} onDeleteClick={jest.fn()} />,
    )

    expect(screen.getByTestId('professional-details-specialties')).toBeInTheDocument()
    expect(screen.queryByTestId(/professional-details-specialty-badge-/)).not.toBeInTheDocument()
  })

  it('renders bio when set', () => {
    renderWithProviders(<ProfessionalDetails professional={professional} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('professional-details-bio')).toHaveTextContent('Especialista em cardiologia.')
  })

  it('does not render bio when null', () => {
    renderWithProviders(
      <ProfessionalDetails professional={{ ...professional, bio: null }} onDeleteClick={jest.fn()} />,
    )

    expect(screen.queryByTestId('professional-details-bio')).not.toBeInTheDocument()
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<ProfessionalDetails professional={professional} onDeleteClick={jest.fn()} />)

    const editButton = screen.getByTestId('professional-details-edit-button')
    expect(editButton).toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<ProfessionalDetails professional={professional} onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('professional-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })

  it('renders createdAt formatted', () => {
    renderWithProviders(<ProfessionalDetails professional={professional} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('professional-details-created-at')).toBeInTheDocument()
  })
})
