jest.mock('../hooks/use-current-clinic.hook')

import { render, waitFor } from '@testing-library/react'
import { useCurrentClinic } from '../hooks/use-current-clinic.hook'
import { ClinicFaviconApplier } from './clinic-favicon-applier'

const mockUseCurrentClinic = useCurrentClinic as jest.MockedFunction<typeof useCurrentClinic>

function makeClinic(overrides: object = {}) {
  return {
    id: 'uuid-1',
    name: 'Clínica do Coração',
    slug: 'clinica-do-coracao',
    isActive: true,
    logoUrl: null as string | null,
    faviconUrl: null as string | null,
    themeId: null,
    address: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function getClinicFaviconLink() {
  return document.head.querySelector<HTMLLinkElement>(
    'link[rel="icon"][data-clinic-favicon]',
  )
}

describe('ClinicFaviconApplier', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getClinicFaviconLink()?.remove()
  })

  it('returns null — renders no DOM element', () => {
    mockUseCurrentClinic.mockReturnValue({ data: undefined, isLoading: false } as any)
    const { container } = render(<ClinicFaviconApplier />)
    expect(container.firstChild).toBeNull()
  })

  it('injects <link rel="icon"> when faviconUrl is present', async () => {
    const faviconUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon.ico'
    mockUseCurrentClinic.mockReturnValue({
      data: makeClinic({ faviconUrl }),
      isLoading: false,
    } as any)

    render(<ClinicFaviconApplier />)

    await waitFor(() => {
      const link = getClinicFaviconLink()
      expect(link).not.toBeNull()
      expect(link?.href).toBe(faviconUrl)
    })
  })

  it('sets data-clinic-favicon attribute on injected link', async () => {
    const faviconUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon.ico'
    mockUseCurrentClinic.mockReturnValue({
      data: makeClinic({ faviconUrl }),
      isLoading: false,
    } as any)

    render(<ClinicFaviconApplier />)

    await waitFor(() => {
      expect(getClinicFaviconLink()?.getAttribute('data-clinic-favicon')).toBe('true')
    })
  })

  it('removes injected link when faviconUrl becomes null', async () => {
    const faviconUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon.ico'

    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = faviconUrl
    link.setAttribute('data-clinic-favicon', 'true')
    document.head.appendChild(link)

    mockUseCurrentClinic.mockReturnValue({
      data: makeClinic({ faviconUrl: null }),
      isLoading: false,
    } as any)

    render(<ClinicFaviconApplier />)

    await waitFor(() => {
      expect(getClinicFaviconLink()).toBeNull()
    })
  })

  it('does not alter the <head> while clinic is loading', () => {
    mockUseCurrentClinic.mockReturnValue({ data: undefined, isLoading: true } as any)

    render(<ClinicFaviconApplier />)

    expect(getClinicFaviconLink()).toBeNull()
  })

  it('updates href when faviconUrl changes', async () => {
    const firstUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon-v1.ico'
    const secondUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon-v2.ico'

    const link = document.createElement('link')
    link.rel = 'icon'
    link.href = firstUrl
    link.setAttribute('data-clinic-favicon', 'true')
    document.head.appendChild(link)

    mockUseCurrentClinic.mockReturnValue({
      data: makeClinic({ faviconUrl: secondUrl }),
      isLoading: false,
    } as any)

    render(<ClinicFaviconApplier />)

    await waitFor(() => {
      expect(getClinicFaviconLink()?.href).toBe(secondUrl)
    })
  })

  it('does not duplicate <link> tags when re-rendered with same faviconUrl', async () => {
    const faviconUrl = 'https://s3.amazonaws.com/clinics/uuid-1/favicon.ico'
    mockUseCurrentClinic.mockReturnValue({
      data: makeClinic({ faviconUrl }),
      isLoading: false,
    } as any)

    const { rerender } = render(<ClinicFaviconApplier />)
    rerender(<ClinicFaviconApplier />)

    await waitFor(() => {
      const links = document.head.querySelectorAll('link[rel="icon"][data-clinic-favicon]')
      expect(links).toHaveLength(1)
    })
  })
})
