jest.mock('../hooks/use-professional.hook')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { ProfessionalSignatureSelect } from './professional-signature-select'
import { useProfessional } from '../hooks/use-professional.hook'
import type { IProfessionalModel } from '../types/professional-model.types'

const mockUseProfessional = useProfessional as jest.Mock

function makeProfessional(overrides: Partial<IProfessionalModel> = {}): IProfessionalModel {
  return {
    id: 'professional-uuid',
    user: { id: 'user-uuid', fullName: 'Dr. Test', email: 'dr@example.com', isActive: true },
    registrations: [
      { id: 'crm-1', number: '12345', state: 'SP', isPrimary: true },
      { id: 'crm-2', number: '67890', state: 'RJ', isPrimary: false },
    ],
    specialties: [
      { id: 'spec-1', name: 'Cardiologia', registryNumber: '111' },
      { id: 'spec-2', name: 'Mastologia', registryNumber: null },
    ],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultProps = {
  professionalId: 'professional-uuid',
  crmId: '',
  specialtyId: '',
  onRegistrationIdChange: jest.fn(),
  onSpecialtyIdChange: jest.fn(),
}

describe('ProfessionalSignatureSelect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders nothing while the professional is not loaded', () => {
    mockUseProfessional.mockReturnValue({ data: undefined })
    renderWithProviders(<ProfessionalSignatureSelect {...defaultProps} />)
    expect(screen.queryByTestId('professional-signature-select')).not.toBeInTheDocument()
  })

  it('renders nothing when the professional has a single CRM and a single specialty', () => {
    mockUseProfessional.mockReturnValue({
      data: makeProfessional({
        registrations: [{ id: 'crm-1', number: '12345', state: 'SP', isPrimary: true }],
        specialties: [{ id: 'spec-1', name: 'Cardiologia', registryNumber: '111' }],
      }),
    })
    renderWithProviders(<ProfessionalSignatureSelect {...defaultProps} />)
    expect(screen.queryByTestId('professional-signature-select')).not.toBeInTheDocument()
  })

  it('shows the CRM picker with a primary marker when there is more than one CRM', () => {
    mockUseProfessional.mockReturnValue({ data: makeProfessional() })
    renderWithProviders(<ProfessionalSignatureSelect {...defaultProps} />)

    const crmSelect = screen.getByTestId('professional-signature-crm')
    expect(crmSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CRM principal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '12345/SP (principal)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '67890/RJ' })).toBeInTheDocument()
  })

  it('shows the specialty picker with RQE labels when there is more than one specialty', () => {
    mockUseProfessional.mockReturnValue({ data: makeProfessional() })
    renderWithProviders(<ProfessionalSignatureSelect {...defaultProps} />)

    expect(screen.getByTestId('professional-signature-specialty')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Especialidade da consulta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Cardiologia — RQE 111' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mastologia — sem RQE' })).toBeInTheDocument()
  })

  it('calls the change handlers when a CRM or specialty is selected', async () => {
    const onRegistrationIdChange = jest.fn()
    const onSpecialtyIdChange = jest.fn()
    mockUseProfessional.mockReturnValue({ data: makeProfessional() })
    renderWithProviders(
      <ProfessionalSignatureSelect
        {...defaultProps}
        onRegistrationIdChange={onRegistrationIdChange}
        onSpecialtyIdChange={onSpecialtyIdChange}
      />,
    )

    await userEvent.selectOptions(screen.getByTestId('professional-signature-crm'), 'crm-2')
    expect(onRegistrationIdChange).toHaveBeenCalledWith('crm-2')

    await userEvent.selectOptions(screen.getByTestId('professional-signature-specialty'), 'spec-2')
    expect(onSpecialtyIdChange).toHaveBeenCalledWith('spec-2')
  })
})
