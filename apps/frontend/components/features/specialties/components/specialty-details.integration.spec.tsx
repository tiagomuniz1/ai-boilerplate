jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/stores/auth.store')

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SpecialtyDetails } from './specialty-details'
import type { ISpecialtyModel } from '../types/specialty-model.types'

const mockPush = jest.fn()

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: { user: { id: string; fullName: string; email: string; role: UserRole } }) => unknown) =>
      selector({ user: { id: 'user-uuid', fullName: 'Test User', email: 'test@example.com', role } }),
  )
}

const specialty: ISpecialtyModel = {
  id: 'uuid-1',
  name: 'Cardiologia',
  description: 'Especialidade do coração',
  clinicCount: 0,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('SpecialtyDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  describe('as PLATFORM_ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.PLATFORM_ADMIN))

    it('renders name and dates', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.getByTestId('specialty-details-name')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('specialty-details-created-at')).toBeInTheDocument()
      expect(screen.getByTestId('specialty-details-updated-at')).toBeInTheDocument()
    })

    it('renders description when set', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.getByTestId('specialty-details-description')).toHaveTextContent('Especialidade do coração')
    })

    it('does not render description when null', () => {
      renderWithProviders(
        <SpecialtyDetails specialty={{ ...specialty, description: null }} onDeleteClick={jest.fn()} />,
      )

      expect(screen.queryByTestId('specialty-details-description')).not.toBeInTheDocument()
    })

    it('renders edit and delete buttons', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.getByTestId('specialty-details-edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('specialty-details-delete-button')).toBeInTheDocument()
    })

    it('calls onDeleteClick when delete button is clicked', async () => {
      const onDeleteClick = jest.fn()

      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={onDeleteClick} />)

      await userEvent.click(screen.getByTestId('specialty-details-delete-button'))

      expect(onDeleteClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('as DOCTOR', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.DOCTOR))

    it('hides edit and delete buttons', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.queryByTestId('specialty-details-edit-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('specialty-details-delete-button')).not.toBeInTheDocument()
    })

    it('renders name and dates', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.getByTestId('specialty-details-name')).toHaveTextContent('Cardiologia')
    })
  })

  describe('as USER', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.USER))

    it('hides edit and delete buttons', () => {
      renderWithProviders(<SpecialtyDetails specialty={specialty} onDeleteClick={jest.fn()} />)

      expect(screen.queryByTestId('specialty-details-edit-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('specialty-details-delete-button')).not.toBeInTheDocument()
    })
  })
})
