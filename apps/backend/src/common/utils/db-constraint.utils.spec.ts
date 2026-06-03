import { QueryFailedError } from 'typeorm'
import { DB_UNIQUE_CONSTRAINTS, isUniqueConstraintViolation } from './db-constraint.utils'

function makeUniqueViolation(code: string, constraint: string): QueryFailedError {
  const error = new QueryFailedError('SELECT 1', [], new Error())
  ;(error as any).code = code
  ;(error as any).constraint = constraint
  return error
}

describe('isUniqueConstraintViolation', () => {
  it('returns true when error is QueryFailedError with code 23505 and matching constraint', () => {
    const error = makeUniqueViolation('23505', DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)
    expect(isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)).toBe(true)
  })

  it('returns false when error is not a QueryFailedError', () => {
    expect(isUniqueConstraintViolation(new Error('generic'), DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)).toBe(false)
  })

  it('returns false when error code is not 23505', () => {
    const error = makeUniqueViolation('23502', DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)
    expect(isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)).toBe(false)
  })

  it('returns false when constraint name does not match', () => {
    const error = makeUniqueViolation('23505', 'some_other_constraint')
    expect(isUniqueConstraintViolation(error, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isUniqueConstraintViolation(null, DB_UNIQUE_CONSTRAINTS.USERS_EMAIL)).toBe(false)
  })
})
