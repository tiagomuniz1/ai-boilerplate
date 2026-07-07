jest.mock('../hooks/use-doctor.hook')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DoctorSignatureSelect } from './doctor-signature-select'
import { useDoctor } from '../hooks/use-doctor.hook'
import type { IDoctorModel } from '../types/doctor-model.types'

const mockUseDoctor = useDoctor as jest.Mock

function makeDoctor(overrides: Partial<IDoctorModel> = {}): IDoctorModel {
  return {
    id: 'doctor-uuid',
    user: { id: 'user-uuid', fullName: 'Dr. Test', email: 'dr@example.com', isActive: true },
    crms: [
      { id: 'crm-1', number: '12345', state: 'SP', isPrimary: true },
      { id: 'crm-2', number: '67890', state: 'RJ', isPrimary: false },
    ],
    specialties: [
      { id: 'spec-1', name: 'Cardiologia', rqe: '111' },
      { id: 'spec-2', name: 'Mastologia', rqe: null },
    ],
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const defaultProps = {
  doctorId: 'doctor-uuid',
  crmId: '',
  specialtyId: '',
  onCrmIdChange: jest.fn(),
  onSpecialtyIdChange: jest.fn(),
}

describe('DoctorSignatureSelect', () => {
  beforeEach(() => jest.clearAllMocks())

  it('renders nothing while the doctor is not loaded', () => {
    mockUseDoctor.mockReturnValue({ data: undefined })
    renderWithProviders(<DoctorSignatureSelect {...defaultProps} />)
    expect(screen.queryByTestId('doctor-signature-select')).not.toBeInTheDocument()
  })

  it('renders nothing when the doctor has a single CRM and a single specialty', () => {
    mockUseDoctor.mockReturnValue({
      data: makeDoctor({
        crms: [{ id: 'crm-1', number: '12345', state: 'SP', isPrimary: true }],
        specialties: [{ id: 'spec-1', name: 'Cardiologia', rqe: '111' }],
      }),
    })
    renderWithProviders(<DoctorSignatureSelect {...defaultProps} />)
    expect(screen.queryByTestId('doctor-signature-select')).not.toBeInTheDocument()
  })

  it('shows the CRM picker with a primary marker when there is more than one CRM', () => {
    mockUseDoctor.mockReturnValue({ data: makeDoctor() })
    renderWithProviders(<DoctorSignatureSelect {...defaultProps} />)

    const crmSelect = screen.getByTestId('doctor-signature-crm')
    expect(crmSelect).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'CRM principal' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '12345/SP (principal)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '67890/RJ' })).toBeInTheDocument()
  })

  it('shows the specialty picker with RQE labels when there is more than one specialty', () => {
    mockUseDoctor.mockReturnValue({ data: makeDoctor() })
    renderWithProviders(<DoctorSignatureSelect {...defaultProps} />)

    expect(screen.getByTestId('doctor-signature-specialty')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Especialidade da consulta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Cardiologia — RQE 111' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Mastologia — sem RQE' })).toBeInTheDocument()
  })

  it('calls the change handlers when a CRM or specialty is selected', async () => {
    const onCrmIdChange = jest.fn()
    const onSpecialtyIdChange = jest.fn()
    mockUseDoctor.mockReturnValue({ data: makeDoctor() })
    renderWithProviders(
      <DoctorSignatureSelect
        {...defaultProps}
        onCrmIdChange={onCrmIdChange}
        onSpecialtyIdChange={onSpecialtyIdChange}
      />,
    )

    await userEvent.selectOptions(screen.getByTestId('doctor-signature-crm'), 'crm-2')
    expect(onCrmIdChange).toHaveBeenCalledWith('crm-2')

    await userEvent.selectOptions(screen.getByTestId('doctor-signature-specialty'), 'spec-2')
    expect(onSpecialtyIdChange).toHaveBeenCalledWith('spec-2')
  })
})
