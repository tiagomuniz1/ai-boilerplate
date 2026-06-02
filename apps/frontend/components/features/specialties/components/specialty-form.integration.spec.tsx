jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../services/specialties.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { SpecialtyForm } from './specialty-form'
import type { ISpecialtyModel } from '../types/specialty-model.types'

const mockPush = jest.fn()

const existingSpecialty: ISpecialtyModel = {
  id: 'uuid-1',
  name: 'Cardiologia',
  description: 'Especialidade do coração',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

describe('SpecialtyForm (integration) — create mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders name and description fields', () => {
    renderWithProviders(<SpecialtyForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('specialty-form-name')).toBeInTheDocument()
    expect(screen.getByTestId('specialty-form-description')).toBeInTheDocument()
  })

  it('calls onSubmit with form values on valid submit', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<SpecialtyForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('specialty-form-name'), 'Cardiologia')
    await userEvent.type(screen.getByTestId('specialty-form-description'), 'Do coração')

    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cardiologia', description: 'Do coração' }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit without description when description is empty', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(<SpecialtyForm mode="create" isPending={false} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByTestId('specialty-form-name'), 'Cardiologia')
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Cardiologia', description: undefined }),
        expect.any(Function),
      )
    })
  })

  it('shows validation error for short name', async () => {
    renderWithProviders(<SpecialtyForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    await userEvent.type(screen.getByTestId('specialty-form-name'), 'AB')
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for description exceeding max length', async () => {
    renderWithProviders(<SpecialtyForm mode="create" isPending={false} onSubmit={jest.fn()} />)

    const longDesc = 'a'.repeat(501)
    await userEvent.type(screen.getByTestId('specialty-form-description'), longDesc)
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Descrição deve ter no máximo 500 caracteres')).toBeInTheDocument()
    })
  })

  it('shows global error when provided', () => {
    renderWithProviders(
      <SpecialtyForm
        mode="create"
        isPending={false}
        globalError="Já existe uma especialidade com este nome."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('specialty-form-error')).toHaveTextContent(
      'Já existe uma especialidade com este nome.',
    )
  })

  it('disables submit button when isPending', () => {
    renderWithProviders(<SpecialtyForm mode="create" isPending={true} onSubmit={jest.fn()} />)

    expect(screen.getByTestId('specialty-form-submit')).toBeDisabled()
  })
})

describe('SpecialtyForm (integration) — edit mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('pre-fills form with existing specialty data', async () => {
    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-name')).toHaveValue('Cardiologia')
    })

    expect(screen.getByTestId('specialty-form-description')).toHaveValue('Especialidade do coração')
  })

  it('calls onSubmit with updated values', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-name')).toHaveValue('Cardiologia')
    })

    await userEvent.clear(screen.getByTestId('specialty-form-name'))
    await userEvent.type(screen.getByTestId('specialty-form-name'), 'Neurologia')
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Neurologia' }),
        expect.any(Function),
      )
    })
  })

  it('sends null for description when "Remover descrição" is checked', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-clear-description')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('specialty-form-clear-description'))
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
        expect.any(Function),
      )
    })
  })

  it('does not show "Remover descrição" checkbox when description is null', () => {
    renderWithProviders(
      <SpecialtyForm
        mode="edit"
        defaultValues={{ ...existingSpecialty, description: null }}
        isPending={false}
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.queryByTestId('specialty-form-clear-description')).not.toBeInTheDocument()
  })

  it('shows validation error for short name in edit mode', async () => {
    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-name')).toHaveValue('Cardiologia')
    })

    await userEvent.clear(screen.getByTestId('specialty-form-name'))
    await userEvent.type(screen.getByTestId('specialty-form-name'), 'AB')
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Nome deve ter no mínimo 3 caracteres')).toBeInTheDocument()
    })
  })

  it('shows validation error for description exceeding max length in edit mode', async () => {
    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={jest.fn()} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-name')).toHaveValue('Cardiologia')
    })

    const longDesc = 'a'.repeat(501)
    await userEvent.type(screen.getByTestId('specialty-form-description'), longDesc)
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Descrição deve ter no máximo 500 caracteres')).toBeInTheDocument()
    })
  })

  it('calls onSubmit with description: undefined when description is cleared', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-description')).toHaveValue('Especialidade do coração')
    })

    await userEvent.clear(screen.getByTestId('specialty-form-description'))
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
        expect.any(Function),
      )
    })
  })

  it('calls onSubmit with name: undefined when name field is cleared', async () => {
    const onSubmit = jest.fn()

    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={false} onSubmit={onSubmit} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('specialty-form-name')).toHaveValue('Cardiologia')
    })

    await userEvent.clear(screen.getByTestId('specialty-form-name'))
    await userEvent.click(screen.getByTestId('specialty-form-submit'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: undefined }),
        expect.any(Function),
      )
    })
  })

  it('shows global error in edit mode when provided', () => {
    renderWithProviders(
      <SpecialtyForm
        mode="edit"
        defaultValues={existingSpecialty}
        isPending={false}
        globalError="Já existe uma especialidade com este nome."
        onSubmit={jest.fn()}
      />,
    )

    expect(screen.getByTestId('specialty-form-error')).toHaveTextContent(
      'Já existe uma especialidade com este nome.',
    )
  })

  it('disables submit button when isPending in edit mode', () => {
    renderWithProviders(
      <SpecialtyForm mode="edit" defaultValues={existingSpecialty} isPending={true} onSubmit={jest.fn()} />,
    )

    expect(screen.getByTestId('specialty-form-submit')).toBeDisabled()
  })
})
