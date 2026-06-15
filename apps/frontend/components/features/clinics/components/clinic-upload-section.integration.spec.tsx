jest.mock('../hooks/use-upload-clinic-logo.hook')
jest.mock('../hooks/use-upload-clinic-favicon.hook')

import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { useUploadClinicLogo } from '../hooks/use-upload-clinic-logo.hook'
import { useUploadClinicFavicon } from '../hooks/use-upload-clinic-favicon.hook'
import { ClinicUploadSection } from './clinic-upload-section'
import type { IClinicModel } from '../types/clinic.types'

const mockUseLogo = useUploadClinicLogo as jest.MockedFunction<typeof useUploadClinicLogo>
const mockUseFavicon = useUploadClinicFavicon as jest.MockedFunction<typeof useUploadClinicFavicon>

const mockLogoMutate = jest.fn()
const mockFaviconMutate = jest.fn()

function makeClinic(overrides: Partial<IClinicModel> = {}): IClinicModel {
  return {
    id: 'uuid-1',
    name: 'Clínica do Coração',
    slug: 'clinica-do-coracao',
    isActive: true,
    logoUrl: null,
    faviconUrl: null,
    themeId: null,
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('ClinicUploadSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseLogo.mockReturnValue({ mutate: mockLogoMutate, isPending: false } as any)
    mockUseFavicon.mockReturnValue({ mutate: mockFaviconMutate, isPending: false } as any)
  })

  it('renders logo and favicon sections', () => {
    renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
    expect(screen.getByTestId('logo-upload')).toBeInTheDocument()
    expect(screen.getByTestId('favicon-upload')).toBeInTheDocument()
  })

  describe('logo upload', () => {
    it('shows letter initial as placeholder when logoUrl is null', () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      expect(screen.getByTestId('logo-preview')).toHaveTextContent('C')
    })

    it('shows logo image when logoUrl is present', () => {
      const logoUrl = 'https://s3.amazonaws.com/clinics/uuid-1/logo.jpg'
      renderWithProviders(<ClinicUploadSection clinic={makeClinic({ logoUrl })} />)
      const img = screen.getByAltText('Clínica do Coração')
      expect(img).toBeInTheDocument()
    })

    it('renders logo upload button', () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      expect(screen.getByTestId('logo-upload-button')).toBeInTheDocument()
    })

    it('shows error when file type is invalid', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('logo-file-input')
      const file = new File(['pdf'], 'document.pdf', { type: 'application/pdf' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })

      fireEvent.change(input)

      expect(await screen.findByTestId('logo-upload-error')).toBeInTheDocument()
      expect(mockLogoMutate).not.toHaveBeenCalled()
    })

    it('shows error when file exceeds 2MB', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('logo-file-input')
      const bigFile = new File([new ArrayBuffer(2 * 1024 * 1024 + 1)], 'big.jpg', {
        type: 'image/jpeg',
      })
      Object.defineProperty(bigFile, 'size', { value: 2 * 1024 * 1024 + 1 })

      await userEvent.upload(input, bigFile)

      expect(await screen.findByTestId('logo-upload-error')).toBeInTheDocument()
      expect(mockLogoMutate).not.toHaveBeenCalled()
    })

    it('calls mutate when file is valid', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('logo-file-input')
      const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockLogoMutate).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })

    it('disables button and shows loading text while uploading', () => {
      mockUseLogo.mockReturnValue({ mutate: mockLogoMutate, isPending: true } as any)
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const button = screen.getByTestId('logo-upload-button')
      expect(button).toBeDisabled()
    })

    it('shows API error message when mutation fails', async () => {
      mockLogoMutate.mockImplementation((_file: File, opts: any) => {
        opts?.onError?.()
      })
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('logo-file-input')
      const file = new File(['img'], 'logo.jpg', { type: 'image/jpeg' })

      await userEvent.upload(input, file)

      expect(await screen.findByTestId('logo-upload-error')).toHaveTextContent(
        'Não foi possível enviar o arquivo. Tente novamente.',
      )
    })
  })

  describe('favicon upload', () => {
    it('shows "ico" placeholder text when faviconUrl is null', () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      expect(screen.getByTestId('favicon-preview')).toHaveTextContent('ico')
    })

    it('renders favicon upload button', () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      expect(screen.getByTestId('favicon-upload-button')).toBeInTheDocument()
    })

    it('shows error when favicon type is invalid', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('favicon-file-input')
      const file = new File(['jpg'], 'image.jpg', { type: 'image/jpeg' })
      Object.defineProperty(input, 'files', { value: [file], configurable: true })

      fireEvent.change(input)

      expect(await screen.findByTestId('favicon-upload-error')).toBeInTheDocument()
      expect(mockFaviconMutate).not.toHaveBeenCalled()
    })

    it('shows error when favicon exceeds 512KB', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('favicon-file-input')
      const bigFile = new File(['x'], 'big.ico', { type: 'image/x-icon' })
      Object.defineProperty(bigFile, 'size', { value: 512 * 1024 + 1 })

      await userEvent.upload(input, bigFile)

      expect(await screen.findByTestId('favicon-upload-error')).toBeInTheDocument()
      expect(mockFaviconMutate).not.toHaveBeenCalled()
    })

    it('calls mutate when favicon file is valid', async () => {
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('favicon-file-input')
      const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })

      await userEvent.upload(input, file)

      await waitFor(() => {
        expect(mockFaviconMutate).toHaveBeenCalledWith(file, expect.any(Object))
      })
    })

    it('disables button and shows loading state while uploading', () => {
      mockUseFavicon.mockReturnValue({ mutate: mockFaviconMutate, isPending: true } as any)
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      expect(screen.getByTestId('favicon-upload-button')).toBeDisabled()
    })

    it('shows API error message when favicon mutation fails', async () => {
      mockFaviconMutate.mockImplementation((_file: File, opts: any) => {
        opts?.onError?.()
      })
      renderWithProviders(<ClinicUploadSection clinic={makeClinic()} />)
      const input = screen.getByTestId('favicon-file-input')
      const file = new File(['ico'], 'favicon.ico', { type: 'image/x-icon' })

      await userEvent.upload(input, file)

      expect(await screen.findByTestId('favicon-upload-error')).toHaveTextContent(
        'Não foi possível enviar o arquivo. Tente novamente.',
      )
    })
  })
})
