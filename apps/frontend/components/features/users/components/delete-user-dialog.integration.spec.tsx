import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserRole } from '@app/shared'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { DeleteUserDialog } from './delete-user-dialog'
import type { IUserModel } from '../types/user-model.types'

const user: IUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.USER,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('DeleteUserDialog (integration)', () => {
  it('renders nothing when user is null', () => {
    const { container } = renderWithProviders(
      <DeleteUserDialog user={null} isOpen={true} isPending={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders dialog with user name when open', () => {
    renderWithProviders(
      <DeleteUserDialog user={user} isOpen={true} isPending={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )

    expect(screen.getByTestId('delete-user-dialog-message')).toHaveTextContent('Alice Costa')
  })

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = jest.fn()

    renderWithProviders(
      <DeleteUserDialog user={user} isOpen={true} isPending={false} onClose={jest.fn()} onConfirm={onConfirm} />,
    )

    await userEvent.click(screen.getByTestId('delete-user-dialog-confirm'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is clicked', async () => {
    const onClose = jest.fn()

    renderWithProviders(
      <DeleteUserDialog user={user} isOpen={true} isPending={false} onClose={onClose} onConfirm={jest.fn()} />,
    )

    await userEvent.click(screen.getByTestId('delete-user-dialog-cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when isPending is true', () => {
    renderWithProviders(
      <DeleteUserDialog user={user} isOpen={true} isPending={true} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )

    expect(screen.getByTestId('delete-user-dialog-confirm')).toBeDisabled()
  })

  it('does not render when isOpen is false', () => {
    renderWithProviders(
      <DeleteUserDialog user={user} isOpen={false} isPending={false} onClose={jest.fn()} onConfirm={jest.fn()} />,
    )

    expect(screen.queryByTestId('delete-user-dialog-confirm')).not.toBeInTheDocument()
  })
})
