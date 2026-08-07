import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const CLINIC_ID = 'cccccccc-0000-0000-0000-000000000001'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@pulso.center',
  role: 'platform_admin',
  clinicId: null,
}

const mockCreatedUser = {
  id: 'uuuuuuuu-0000-0000-0000-000000000001',
  fullName: 'Admin da Clínica',
  email: 'admin.clinica@test.com',
  role: 'admin',
  isActive: true,
  plan: 'free',
  isProfessional: false,
  isPatient: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
}

describe('Clinics Create User', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Nome deve ter no mínimo 3 caracteres').should('be.visible')
    cy.contains('E-mail inválido').should('be.visible')
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('shows validation error when password is too short', () => {
    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin@clinica.com')
    cy.get('[data-testid="user-form-password"]').type('short')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.contains('Senha deve ter no mínimo 8 caracteres').should('be.visible')
  })

  it('back button returns to /clinics/:id', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/${CLINIC_ID}`, {
      statusCode: 200,
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, plan: 'free', createdAt: new Date(), updatedAt: new Date() },
    })

    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
    cy.get('[data-testid="new-clinic-user-back-button"]').click()
    expectBackofficePath(`/clinics/${CLINIC_ID}`)
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/users`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedUser })
    }).as('createUser')

    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
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
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, plan: 'free', createdAt: new Date(), updatedAt: new Date() },
    })

    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
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
      body: { id: CLINIC_ID, name: 'Clínica Test', slug: 'clinica-test', isActive: true, plan: 'free', createdAt: new Date(), updatedAt: new Date() },
    })

    visitBackoffice(`/clinics/${CLINIC_ID}/users/new`, mockPlatformAdmin)
    cy.get('[data-testid="user-form-fullname"]').type('Admin da Clínica')
    cy.get('[data-testid="user-form-email"]').type('admin.clinica@test.com')
    cy.get('[data-testid="user-form-password"]').type('Password123!')
    cy.get('[data-testid="user-form-submit"]').click()
    cy.wait('@createUser')
    expectBackofficePath(`/clinics/${CLINIC_ID}`)
  })

})

export {}
