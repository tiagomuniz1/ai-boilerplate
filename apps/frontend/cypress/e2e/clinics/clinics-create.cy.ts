const MOCK_TOKEN = 'mock-access-token'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@umi.dev',
  role: 'platform_admin',
  clinicId: null,
}

const mockCreatedClinic = {
  id: 'cccccccc-0000-0000-0000-000000000002',
  name: 'Clínica Teste E2E',
  slug: 'clinica-teste-e2e',
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }

function visitWithPlatformAdmin(url: string) {
  cy.intercept('GET', `${Cypress.env('API_URL')}/auth/me`, {
    statusCode: 200,
    body: mockPlatformAdmin,
  })
  cy.setCookie('access_token', MOCK_TOKEN, {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    path: '/',
    domain: 'localhost',
  })
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem(
        'auth-user',
        JSON.stringify({ state: { user: mockPlatformAdmin }, version: 0 }),
      )
    },
  })
}

describe('Clinics Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitWithPlatformAdmin('/clinics/new')
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.contains('Nome deve ter ao menos 3 caracteres').should('be.visible')
  })

  it('shows conflict error when slug is already taken (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Slug already in use' },
    }).as('createClinic')

    visitWithPlatformAdmin('/clinics/new')
    cy.fixture('clinics').then((fixture) => {
      cy.get('[data-testid="clinic-form-name"]').type(fixture.newClinic.name)
      cy.get('[data-testid="clinic-form-slug"]').type(fixture.newClinic.slug)
    })
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.wait('@createClinic')
    cy.get('[data-testid="clinic-form-error"]').should('be.visible')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedClinic })
    }).as('createClinic')

    visitWithPlatformAdmin('/clinics/new')
    cy.fixture('clinics').then((fixture) => {
      cy.get('[data-testid="clinic-form-name"]').type(fixture.newClinic.name)
      cy.get('[data-testid="clinic-form-slug"]').type(fixture.newClinic.slug)
    })
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.get('[data-testid="clinic-form-submit"]').should('be.disabled')
    cy.wait('@createClinic')
  })

  it('back button returns to /clinics', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: emptyListResponse,
    })

    visitWithPlatformAdmin('/clinics/new')
    cy.get('[data-testid="new-clinic-back-button"]').click()
    cy.url().should('match', /\/clinics$/)
  })

  it('creates clinic and redirects to /clinics list', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`, {
      statusCode: 201,
      body: mockCreatedClinic,
    }).as('createClinic')
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: { data: [mockCreatedClinic], total: 1, page: 1, limit: 20 },
    }).as('getClinics')

    visitWithPlatformAdmin('/clinics/new')
    cy.fixture('clinics').then((fixture) => {
      cy.get('[data-testid="clinic-form-name"]').type(fixture.newClinic.name)
      cy.get('[data-testid="clinic-form-slug"]').type(fixture.newClinic.slug)
    })
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.wait('@createClinic')
    cy.url().should('match', /\/clinics$/)
    cy.wait('@getClinics')
    cy.get(`[data-testid="clinic-table-row-${mockCreatedClinic.id}"]`).should('exist')
  })

  it('creates clinic via real API and redirects to /clinics', () => {
    let createdId: string
    let platformAdminToken: string

    cy.fixture('clinics').then((fixture) => {
      cy.login(fixture.platformAdmin.email, fixture.platformAdmin.password)
      platformAdminToken = ''

      cy.request({
        method: 'POST',
        url: `${Cypress.env('API_URL')}/auth/login`,
        body: { email: fixture.platformAdmin.email, password: fixture.platformAdmin.password },
      }).then((res) => {
        const cookies = Array.isArray(res.headers['set-cookie'])
          ? res.headers['set-cookie']
          : [res.headers['set-cookie'] as string]
        const tokenCookie = cookies?.find((c: string) => c?.startsWith('access_token='))
        if (tokenCookie) platformAdminToken = tokenCookie.split(';')[0].replace('access_token=', '')
      })
    })

    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`).as('createClinic')

    cy.visit('/clinics/new')
    const ts = Date.now()
    cy.get('[data-testid="clinic-form-name"]').type(`Clínica Real ${ts}`)
    cy.get('[data-testid="clinic-form-slug"]').type(`clinica-real-${ts}`)
    cy.get('[data-testid="clinic-form-submit"]').click()

    cy.wait('@createClinic').then((interception) => {
      createdId = interception.response?.body.id
    })

    cy.url().should('match', /\/clinics$/)

    cy.then(() => {
      if (createdId && platformAdminToken) cy.deleteClinicViaApi(createdId, platformAdminToken)
    })
  })
})

export {}
