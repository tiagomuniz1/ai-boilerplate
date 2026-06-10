const MOCK_TOKEN = 'mock-access-token'
const CLINIC_ID = 'cccccccc-0000-0000-0000-000000000001'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@umi.dev',
  role: 'platform_admin',
  clinicId: null,
}

const mockCreatedUser = {
  id: 'uuuuuuuu-0000-0000-0000-000000000001',
  fullName: 'Admin da Clínica',
  email: 'admin.clinica@test.com',
  role: 'admin',
  isActive: true,
  isDoctor: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

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

describe('Clinics Create User', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
    cy.contains('E-mail inválido').should('be.visible')
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('shows validation error when password is too short', () => {
    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin@clinica.com')
    cy.get('[data-testid="user-form-password"]').type('short')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('back button returns to /clinics/:id', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}`, {
      statusCode: 200,
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    })

    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="new-clinic-user-back-button"]').click()
    cy.url().should('include', `/clinics/${CLINIC_ID}`)
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedUser })
    }).as('createUser')

    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin.clinica@test.com')
    cy.get('[data-testid="user-form-password"]').type('Password123!')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.get('[data-testid="user-form-submit"]').should('be.disabled')
    cy.wait('@createUser')
  })

  it('sends clinicId in request body', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, {
      statusCode: 201,
      body: mockCreatedUser,
    }).as('createUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}`, {
      statusCode: 200,
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    })

    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin.clinica@test.com')
    cy.get('[data-testid="user-form-password"]').type('Password123!')
    cy.get('[data-testid="user-form-submit"]').click()

    cy.wait('@createUser').its('request.body.clinicId').should('eq', CLINIC_ID)
  })

  it('creates user and redirects to /clinics/:id', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, {
      statusCode: 201,
      body: mockCreatedUser,
    }).as('createUser')
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}`, {
      statusCode: 200,
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    })

    visitWithPlatformAdmin(`/clinics/${CLINIC_ID}/users/new`)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin.clinica@test.com')
    cy.get('[data-testid="user-form-password"]').type('Password123!')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@createUser')
    cy.url().should('include', `/clinics/${CLINIC_ID}`)
  })

  it('creates user via real API and redirects to clinic page', () => {
    let createdUserId: string
    let createdClinicId: string
    let platformAdminToken: string

    cy.seedClinic().then((clinic) => {
      createdClinicId = clinic.id
      platformAdminToken = clinic.platformAdminToken

      cy.fixture('clinics').then((fixture) => {
        cy.login(fixture.platformAdmin.email, fixture.platformAdmin.password)
      })

      cy.intercept('POST', `${Cypress.env('API_URL')}/users`).as('createUser')

      cy.visit(`/clinics/${createdClinicId}/users/new`)
      const ts = Date.now()
      cy.get('[data-testid="user-form-fullname"]').type('Admin Clínica Real')
      cy.get('[data-testid="user-form-email"]').type(`admin.real.${ts}@test.com`)
      cy.get('[data-testid="user-form-password"]').type('Password123!')
      cy.get('[data-testid="user-form-role"]').select('admin')
      cy.get('[data-testid="user-form-submit"]').click()

      cy.wait('@createUser').then((interception) => {
        createdUserId = interception.response?.body.id
        expect(interception.request.body.clinicId).to.eq(createdClinicId)
      })

      cy.url().should('include', `/clinics/${createdClinicId}`)
    })

    cy.then(() => {
      if (createdUserId && platformAdminToken) {
        cy.deleteUserViaApi(createdUserId, platformAdminToken)
      }
      if (createdClinicId && platformAdminToken) {
        cy.deleteClinicViaApi(createdClinicId, platformAdminToken)
      }
    })
  })
})

export {}
