jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ClinicDetails } from './clinic-details'
import type { IClinicModel } from '../types/clinic.types'

const mockPush = jest.fn()

const activeClinic: IClinicModel = {
  id: 'uuid-1',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

const inactiveClinic: IClinicModel = {
  ...activeClinic,
  isActive: false,
}

describe('ClinicDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders clinic name and slug', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-name')).toHaveTextContent('Clínica do Coração')
    expect(screen.getByTestId('clinic-details-slug')).toHaveTextContent('clinica-do-coracao')
  })

  it('renders active status for active clinic', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-status')).toHaveTextContent('Ativa')
    expect(screen.queryByTestId('clinic-details-inactive-badge')).not.toBeInTheDocument()
  })

  it('renders inactive badge for inactive clinic', () => {
    renderWithProviders(<ClinicDetails clinic={inactiveClinic} />)

    expect(screen.getByTestId('clinic-details-inactive-badge')).toHaveTextContent('Inativa')
  })

  it('renders slug in detail row', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-slug-field')).toHaveTextContent('clinica-do-coracao')
  })

  it('renders createdAt formatted', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-created-at')).toBeInTheDocument()
  })

  it('renders updatedAt formatted', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-updated-at')).toBeInTheDocument()
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.getByTestId('clinic-details-edit-button')).toBeInTheDocument()
  })

  it('renders new user button linking to clinic users/new page', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    const button = screen.getByTestId('clinic-details-new-user-button')
    expect(button).toBeInTheDocument()
    expect(button.closest('a')).toHaveAttribute('href', '/clinics/uuid-1/users/new')
  })

  it('does not render a delete button', () => {
    renderWithProviders(<ClinicDetails clinic={activeClinic} />)

    expect(screen.queryByTestId('clinic-details-delete-button')).not.toBeInTheDocument()
  })
})
