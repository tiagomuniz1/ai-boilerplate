jest.mock('../services/clinics.service')

import { clinicsService } from '../services/clinics.service'
import { registerClinicUseCase } from './register-clinic.use-case'

const makeInput = () => ({
  clinicName: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  adminFullName: 'Admin Silva',
  adminEmail: 'admin@clinica.com',
  adminPassword: 'senha1234',
})

const makeResponse = () => ({
  clinic: { id: 'clinic-uuid-1', name: 'Clínica do Coração', slug: 'clinica-do-coracao' },
  admin: { id: 'admin-uuid-1', fullName: 'Admin Silva', email: 'admin@clinica.com' },
})

describe('registerClinicUseCase', () => {
  it('calls clinicsService.register with input and returns response', async () => {
    const input = makeInput()
    const response = makeResponse()
    ;(clinicsService.register as jest.Mock).mockResolvedValue(response)

    const result = await registerClinicUseCase(input)

    expect(clinicsService.register).toHaveBeenCalledWith(input)
    expect(result).toEqual(response)
  })

  it('calls clinicsService.register without slug when slug is undefined', async () => {
    const { slug: _slug, ...inputWithoutSlug } = makeInput()
    ;(clinicsService.register as jest.Mock).mockResolvedValue(makeResponse())

    await registerClinicUseCase(inputWithoutSlug)

    expect(clinicsService.register).toHaveBeenCalledWith(inputWithoutSlug)
  })

  it('propagates errors from clinicsService.register', async () => {
    const error = { status: 409, title: 'Conflict', detail: 'Slug already in use' }
    ;(clinicsService.register as jest.Mock).mockRejectedValue(error)

    await expect(registerClinicUseCase(makeInput())).rejects.toEqual(error)
  })
})
