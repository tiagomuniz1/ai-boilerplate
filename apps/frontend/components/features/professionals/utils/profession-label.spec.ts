import { CouncilType } from '@app/shared'
import { primaryRegistration, primaryProfessionLabel, primaryRegistrationLabel } from './profession-label'
import type { IProfessionalRegistrationModel } from '../types/professional-model.types'

function buildRegistration(overrides: Partial<IProfessionalRegistrationModel> = {}): IProfessionalRegistrationModel {
  return {
    id: 'reg-1',
    councilType: CouncilType.CRN,
    number: '12345',
    state: 'SP',
    isPrimary: true,
    ...overrides,
  }
}

describe('primaryRegistration', () => {
  it('returns null when there are no registrations', () => {
    expect(primaryRegistration([])).toBeNull()
  })

  it('returns the registration marked as primary', () => {
    const secondary = buildRegistration({ id: 'reg-1', isPrimary: false })
    const primary = buildRegistration({ id: 'reg-2', isPrimary: true })
    expect(primaryRegistration([secondary, primary])).toBe(primary)
  })

  it('falls back to the first registration when none is marked as primary', () => {
    const first = buildRegistration({ id: 'reg-1', isPrimary: false })
    const second = buildRegistration({ id: 'reg-2', isPrimary: false })
    expect(primaryRegistration([first, second])).toBe(first)
  })
})

describe('primaryProfessionLabel', () => {
  it('returns the profession label for the primary registration', () => {
    expect(primaryProfessionLabel([buildRegistration({ councilType: CouncilType.CRN })])).toBe('Nutrição')
  })

  it('returns a dash when there are no registrations', () => {
    expect(primaryProfessionLabel([])).toBe('—')
  })
})

describe('primaryRegistrationLabel', () => {
  it('formats council type, number and state', () => {
    expect(primaryRegistrationLabel([buildRegistration({ councilType: CouncilType.CRN, number: '12345', state: 'SP' })])).toBe(
      'CRN 12345/SP',
    )
  })

  it('appends a +N suffix when there are additional registrations', () => {
    const primary = buildRegistration({ id: 'reg-1', isPrimary: true })
    const other = buildRegistration({ id: 'reg-2', isPrimary: false })
    expect(primaryRegistrationLabel([primary, other])).toBe('CRN 12345/SP +1')
  })

  it('returns a dash when there are no registrations', () => {
    expect(primaryRegistrationLabel([])).toBe('—')
  })
})
