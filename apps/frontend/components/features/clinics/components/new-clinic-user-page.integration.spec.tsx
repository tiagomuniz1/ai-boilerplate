jest.mock('next/navigation', () => ({ useRouter: jest.fn(), useParams: jest.fn() }))
jest.mock('@/components/features/users/hooks/use-create-clinic-admin-user.hook')
jest.mock('@/lib/slug-context', () => ({ useBasePath: () => '/backoffice' }))

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter, useParams } from 'next/navigation'
import { useCreateClinicAdminUser } from '@/components/features/users/hooks/use-create-clinic-admin-user.hook'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import NewClinicUserPage from '@/app/backoffice/(authenticated)/clinics/[id]/users/new/page'

const mockPush = jest.fn()
const mockMutate = jest.fn()
const CLINIC_ID = 'clinic-uuid-1'

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  ;(useParams as jest.Mock).mockReturnValue({ id: CLINIC_ID })
  ;(useCreateClinicAdminUser as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: false })
})

describe('NewClinicUserPage (integration)', () => {
  it('renders the page with form and back button', () => {
    renderWithProviders(<NewClinicUserPage />)

    expect(screen.getByTestId('new-clinic-user-page')).toBeInTheDocument()
    expect(screen.getByTestId('user-form')).toBeInTheDocument()
    expect(screen.getByTestId('new-clinic-user-back-button')).toBeInTheDocument()
  })

  it('back button links to /backoffice/clinics/:id', () => {
    renderWithProviders(<NewClinicUserPage />)

    expect(screen.getByTestId('new-clinic-user-back-button').closest('a')).toHaveAttribute(
      'href',
      `/backoffice/clinics/${CLINIC_ID}`,
    )
  })

  it('passes clinicId from URL to useCreateClinicAdminUser', () => {
    renderWithProviders(<NewClinicUserPage />)

    expect(useCreateClinicAdminUser).toHaveBeenCalledWith(CLINIC_ID)
  })

  it('calls mutate with form data on submit', async () => {
    renderWithProviders(<NewClinicUserPage />)

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Alice Costa')
    await userEvent.type(screen.getByTestId('user-form-email'), 'alice@example.com')
    await userEvent.type(screen.getByTestId('user-form-password'), 'Password123!')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ fullName: 'Alice Costa', email: 'alice@example.com' }),
        expect.any(Object),
      )
    })
  })

  it('shows global error message when API returns non-422 error', async () => {
    ;(useCreateClinicAdminUser as jest.Mock).mockReturnValue({
      mutate: (_data: unknown, opts: { onError: (e: unknown) => void }) => {
        opts.onError({ status: 500, title: 'Server Error' })
      },
      isPending: false,
    })

    renderWithProviders(<NewClinicUserPage />)

    await userEvent.type(screen.getByTestId('user-form-fullname'), 'Alice Costa')
    await userEvent.type(screen.getByTestId('user-form-email'), 'alice@example.com')
    await userEvent.type(screen.getByTestId('user-form-password'), 'Password123!')
    await userEvent.click(screen.getByTestId('user-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('user-form-error')).toBeInTheDocument()
    })
  })

  it('disables submit button while isPending', () => {
    ;(useCreateClinicAdminUser as jest.Mock).mockReturnValue({ mutate: mockMutate, isPending: true })

    renderWithProviders(<NewClinicUserPage />)

    expect(screen.getByTestId('user-form-submit')).toBeDisabled()
  })
})
