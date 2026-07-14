jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: () => 'test-clinic', useBasePath: () => '/test-clinic' }))

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { UserTableRow } from './user-table-row'
import type { IUserModel } from '../types/user-model.types'

const makeUser = (overrides: Partial<IUserModel> = {}): IUserModel => ({
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.USER,
  isActive: true,
  isDoctor: false,
  isPatient: false,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
  ...overrides,
})

describe('UserTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
  })

  it('renders user name and email', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser()} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-name-uuid-1')).toHaveTextContent('Alice Costa')
    expect(screen.getByTestId('user-email-uuid-1')).toHaveTextContent('alice@example.com')
  })

  it('shows "Ativo" when user is active', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ isActive: true })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-status-uuid-1')).toHaveTextContent('Ativo')
  })

  it('shows "Inativo" when user is inactive', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ isActive: false })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-status-uuid-1')).toHaveTextContent('Inativo')
  })

  it('shows Admin role badge for ADMIN role', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ role: UserRole.ADMIN })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-role-uuid-1')).toHaveTextContent('Admin')
  })

  it('shows Platform Admin role badge for PLATFORM_ADMIN role', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ role: UserRole.PLATFORM_ADMIN })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-role-uuid-1')).toHaveTextContent('Platform Admin')
  })

  it('shows Médico profile badge when isDoctor is true', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ isDoctor: true })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-profile-doctor-uuid-1')).toHaveTextContent('Médico')
  })

  it('shows Paciente profile badge when isPatient is true', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser({ isPatient: true })} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-profile-patient-uuid-1')).toHaveTextContent('Paciente')
  })

  it('enables delete button when isCurrentUser is false', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser()} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-delete-button-uuid-1')).not.toBeDisabled()
  })

  it('disables delete button when isCurrentUser is true', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser()} isCurrentUser={true} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-delete-button-uuid-1')).toBeDisabled()
  })

  it('calls onDeleteClick with the user when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()
    const user = makeUser()

    render(
      <table>
        <tbody>
          <UserTableRow user={user} isCurrentUser={false} onDeleteClick={onDeleteClick} />
        </tbody>
      </table>,
    )

    await userEvent.click(screen.getByTestId('user-delete-button-uuid-1'))

    expect(onDeleteClick).toHaveBeenCalledWith(user)
  })

  it('renders edit and view links', () => {
    render(
      <table>
        <tbody>
          <UserTableRow user={makeUser()} isCurrentUser={false} onDeleteClick={jest.fn()} />
        </tbody>
      </table>,
    )

    expect(screen.getByTestId('user-edit-link-uuid-1')).toHaveAttribute('href', '/test-clinic/users/uuid-1/edit')
    expect(screen.getByTestId('user-view-link-uuid-1')).toHaveAttribute('href', '/test-clinic/users/uuid-1')
  })
})
