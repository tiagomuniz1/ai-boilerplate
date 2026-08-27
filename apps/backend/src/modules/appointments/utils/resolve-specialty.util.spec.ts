import { UnprocessableEntityException } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { resolveSpecialty } from './resolve-specialty.util'

describe('resolveSpecialty', () => {
  const cardiology = { id: faker.string.uuid(), name: 'Cardiologia' }
  const dermatology = { id: faker.string.uuid(), name: 'Dermatologia' }

  it('returns null for a generalist professional with no specialties', () => {
    expect(resolveSpecialty([])).toBeNull()
  })

  it('resolves automatically when the professional has exactly one specialty', () => {
    expect(resolveSpecialty([cardiology])).toBe(cardiology)
  })

  it('throws when the professional has more than one specialty and none was requested', () => {
    expect(() => resolveSpecialty([cardiology, dermatology])).toThrow(UnprocessableEntityException)
    expect(() => resolveSpecialty([cardiology, dermatology])).toThrow('specialtyId is required')
  })

  it('returns the requested specialty when it belongs to the professional', () => {
    expect(resolveSpecialty([cardiology, dermatology], dermatology.id)).toBe(dermatology)
  })

  it('throws when the requested specialty does not belong to the professional', () => {
    expect(() => resolveSpecialty([cardiology], faker.string.uuid())).toThrow(
      UnprocessableEntityException,
    )
    expect(() => resolveSpecialty([cardiology], faker.string.uuid())).toThrow(
      'Specialty does not belong to this professional',
    )
  })

  it('throws when a specialty is requested but the professional has none', () => {
    expect(() => resolveSpecialty([], faker.string.uuid())).toThrow(UnprocessableEntityException)
  })
})
