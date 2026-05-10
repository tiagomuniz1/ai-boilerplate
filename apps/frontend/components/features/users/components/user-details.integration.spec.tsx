jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { UserDetails } from './user-details'
import type { IUserModel } from '../types/user-model.types'

const mockPush = jest.fn()

const user: IUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.ADMIN,
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('UserDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all user fields', () => {
    renderWithProviders(<UserDetails user={user} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-name')).toHaveTextContent('Alice Costa')
    expect(screen.getByTestId('user-details-email')).toHaveTextContent('alice@example.com')
    expect(screen.getByTestId('user-details-status')).toHaveTextContent('Ativo')
    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Admin')
    expect(screen.getByTestId('user-details-created-at')).toBeInTheDocument()
  })

  it('renders "Inativo" for inactive user', () => {
    renderWithProviders(<UserDetails user={{ ...user, isActive: false }} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-status')).toHaveTextContent('Inativo')
  })

  it('renders "Usuário" role label for USER role', () => {
    renderWithProviders(<UserDetails user={{ ...user, role: UserRole.USER }} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Usuário')
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<UserDetails user={user} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-edit-button')).toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<UserDetails user={user} onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('user-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })
})
