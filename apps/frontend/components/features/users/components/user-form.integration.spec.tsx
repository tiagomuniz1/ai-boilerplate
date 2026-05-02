jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/users.service')

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { userService } from '../services/users.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { UserForm } from './user-form'
import type { IUserModel } from '../types/user-model.types'
import type { ICreateUserInput } from '../types/user-input.types'

const mockPush = jest.fn()

const existingUser: IUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('UserForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all create fields including password', () => {
    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('user-form-fullname')).toBeInTheDocument()
    expect(screen.getByTestId('user-form-email')).toBeInTheDocument()
    expect(screen.getByTestId('user-form-password')).toBeInTheDocument()
    expect(screen.getByTestId('user-form-role')).toBeInTheDocument()
  })

  it('calls onSubmit with form values on valid submit', async () => {
    ;(userService.create as jest.Mock).mockResolvedValue({
      id: 'uuid-new',
      fullName: 'Bob Silva',
      email: 'bob@example.com',
      role: UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const onSubmit = jest.fn()

    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Bob Silva')
    await userEvent.type(screen.getByTestId('user-form-email'), 'bob@example.com')
    await userEvent.type(screen.getByTestId('user-form-password'), 'password123')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Bob Silva',
          email: 'bob@example.com',
          password: 'password123',
        }),
        expect.any(Function),
      )
    })
  })

  it('shows validation errors for empty required fields', async () => {
    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Bob Silva')
    await userEvent.type(screen.getByTestId('user-form-email'), 'invalid-email')
    await userEvent.type(screen.getByTestId('user-form-password'), 'password123')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  it('disables submit button while isPending', () => {
    renderWithProviders(
      <UserForm mode="create" isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('user-form-submit')).toBeDisabled()
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <UserForm mode="create" isPending={false} globalError="Não foi possível criar o usuário." onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('user-form-error')).toHaveTextContent('Não foi possível criar o usuário.')
  })

  it('shows role validation error when invalid role is submitted', async () => {
    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={jest.fn()} />,
    )

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Bob Silva')
    await userEvent.type(screen.getByTestId('user-form-email'), 'bob@example.com')
    await userEvent.type(screen.getByTestId('user-form-password'), 'password123')
    fireEvent.change(screen.getByTestId('user-form-role'), { target: { value: '' } })
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Role inválida')).toBeInTheDocument()
    })
  })

  it('maps 422 error to field via setError callback', async () => {
    const onSubmit = jest.fn((_: ICreateUserInput, setError: (field: keyof ICreateUserInput, e: { message: string }) => void) => {
      setError('email', { message: 'E-mail já em uso' })
    })

    renderWithProviders(
      <UserForm mode="create" isPending={false} onSubmit={onSubmit} />,
    )

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Bob Silva')
    await userEvent.type(screen.getByTestId('user-form-email'), 'taken@example.com')
    await userEvent.type(screen.getByTestId('user-form-password'), 'password123')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail já em uso')).toBeInTheDocument()
    })
  })
})

describe('UserForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('shows global error in edit mode', () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} globalError="Erro ao atualizar" onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('user-form-error')).toHaveTextContent('Erro ao atualizar')
  })

  it('disables submit button while isPending in edit mode', () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('user-form-submit')).toBeDisabled()
  })

  it('maps empty fullName and email to undefined on edit submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-fullname').value).toBe('Alice Costa')
    })

    await userEvent.clear(screen.getByTestId('user-form-fullname'))
    await userEvent.clear(screen.getByTestId('user-form-email'))
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: undefined, email: undefined }),
        expect.any(Function),
      )
    })
  })

  it('shows role validation error in edit mode', async () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-fullname').value).toBe('Alice Costa')
    })

    fireEvent.change(screen.getByTestId('user-form-role'), { target: { value: '' } })
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Role inválida')).toBeInTheDocument()
    })
  })

  it('shows fullName validation error in edit mode', async () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-fullname').value).toBe('Alice Costa')
    })

    await userEvent.clear(screen.getByTestId('user-form-fullname'))
    await userEvent.type(screen.getByTestId('user-form-fullname'), 'AB')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows email validation error in edit mode', async () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-email').value).toBe('alice@example.com')
    })

    await userEvent.clear(screen.getByTestId('user-form-email'))
    await userEvent.type(screen.getByTestId('user-form-email'), 'invalid-email')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('E-mail inválido')).toBeInTheDocument()
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders isActive checkbox in edit mode', async () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-isactive').checked).toBe(true)
    })
  })

  it('submits isActive false when checkbox is unchecked', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-isactive').checked).toBe(true)
    })

    await userEvent.click(screen.getByTestId('user-form-isactive'))
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
        expect.any(Function),
      )
    })
  })

  it('does not render password field in edit mode', () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    expect(screen.queryByTestId('user-form-password')).not.toBeInTheDocument()
  })

  it('pre-fills form with defaultValues', async () => {
    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-fullname').value).toBe('Alice Costa')
      expect(screen.getByTestId<HTMLInputElement>('user-form-email').value).toBe('alice@example.com')
    })
  })

  it('calls onSubmit on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <UserForm mode="edit" defaultValues={existingUser} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId<HTMLInputElement>('user-form-fullname').value).toBe('Alice Costa')
    })

    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })
})
