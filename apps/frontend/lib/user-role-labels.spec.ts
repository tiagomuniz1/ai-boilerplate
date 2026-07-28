import { UserRole } from '@app/shared'
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './user-role-labels'

const ALL_ROLES = Object.values(UserRole)

describe('USER_ROLE_LABELS', () => {
  it('has a label for every UserRole value', () => {
    ALL_ROLES.forEach((role) => {
      expect(USER_ROLE_LABELS[role]).toEqual(expect.any(String))
      expect(USER_ROLE_LABELS[role].length).toBeGreaterThan(0)
    })
  })

  it('labels USER as Recepcionista, not Usuário', () => {
    expect(USER_ROLE_LABELS[UserRole.USER]).toBe('Recepcionista')
  })
})

describe('USER_ROLE_DESCRIPTIONS', () => {
  it('has a description for every UserRole value', () => {
    ALL_ROLES.forEach((role) => {
      expect(USER_ROLE_DESCRIPTIONS[role]).toEqual(expect.any(String))
      expect(USER_ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(0)
    })
  })
})
