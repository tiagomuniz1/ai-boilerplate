import { PUBLIC_ROUTES, NAVIGATION_ITEMS } from './constants'

describe('PUBLIC_ROUTES', () => {
  it('contains the expected public route paths', () => {
    expect(PUBLIC_ROUTES).toEqual(['/login', '/register', '/forgot-password'])
  })
})

describe('NAVIGATION_ITEMS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NAVIGATION_ITEMS)).toBe(true)
    expect(NAVIGATION_ITEMS.length).toBeGreaterThan(0)
  })

  it('each item has required fields', () => {
    NAVIGATION_ITEMS.forEach((item) => {
      expect(item.id).toBeDefined()
      expect(typeof item.id).toBe('string')
      expect(item.label).toBeDefined()
      expect(typeof item.label).toBe('string')
      expect(item.href).toBeDefined()
      expect(typeof item.href).toBe('string')
      expect(item.icon).toBeDefined()
    })
  })

  it('contains a dashboard item', () => {
    expect(NAVIGATION_ITEMS.find((i) => i.id === 'dashboard')).toBeDefined()
  })

  it('contains a users item', () => {
    expect(NAVIGATION_ITEMS.find((i) => i.id === 'users')).toBeDefined()
  })

  it('all hrefs start with a slash', () => {
    NAVIGATION_ITEMS.forEach((item) => {
      expect(item.href.startsWith('/')).toBe(true)
    })
  })

  it('all ids are unique', () => {
    const ids = NAVIGATION_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
