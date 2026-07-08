jest.mock('../../config/env.config')

import { getEnvConfig } from '../../config/env.config'
import { ClinicAssetUrlService } from './clinic-asset-url.service'

const mockGetEnvConfig = getEnvConfig as jest.MockedFunction<typeof getEnvConfig>

describe('ClinicAssetUrlService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEnvConfig.mockReturnValue({ PUBLIC_API_URL: 'https://api.pulso.center' } as any)
  })

  it('builds a delivery URL with the asset type and updatedAt cache-buster', () => {
    const service = new ClinicAssetUrlService()
    const updatedAt = new Date('2026-01-02T03:04:05.000Z')

    const url = service.build('acme', 'logo', updatedAt)

    expect(url).toBe(`https://api.pulso.center/clinics/acme/logo?v=${updatedAt.getTime()}`)
  })

  it('supports logo-dark and favicon asset types', () => {
    const service = new ClinicAssetUrlService()
    const updatedAt = new Date('2026-01-02T03:04:05.000Z')

    expect(service.build('acme', 'logo-dark', updatedAt)).toContain('/clinics/acme/logo-dark?v=')
    expect(service.build('acme', 'favicon', updatedAt)).toContain('/clinics/acme/favicon?v=')
  })

  it('strips a trailing slash from the configured base URL', () => {
    mockGetEnvConfig.mockReturnValue({ PUBLIC_API_URL: 'https://api.pulso.center/' } as any)
    const service = new ClinicAssetUrlService()

    const url = service.build('acme', 'logo', new Date(0))

    expect(url).toBe('https://api.pulso.center/clinics/acme/logo?v=0')
  })
})
