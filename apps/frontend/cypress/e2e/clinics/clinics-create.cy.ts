import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@pulso.center',
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

// O createSchema do clinic-form exige endereço completo além de nome/slug.
function fillClinicForm() {
  cy.fixture('clinics').then((fixture) => {
    cy.get('[data-testid="clinic-form-name"]').type(fixture.newClinic.name)
    cy.get('[data-testid="clinic-form-slug"]').type(fixture.newClinic.slug)
  })
  cy.get('[data-testid="clinic-form-address-street"]').type('Rua das Flores')
  cy.get('[data-testid="clinic-form-address-number"]').type('123')
  cy.get('[data-testid="clinic-form-address-neighborhood"]').type('Centro')
  cy.get('[data-testid="clinic-form-address-city"]').type('São Paulo')
  cy.get('[data-testid="clinic-form-address-state"]').type('SP')
  cy.get('[data-testid="clinic-form-address-zipcode"]').type('01310-100')
}

describe('Clinics Create', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows validation errors when submitting empty form', () => {
    visitBackoffice('/clinics/new', mockPlatformAdmin)
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.contains('Nome deve ter ao menos 3 caracteres').should('be.visible')
  })

  it('shows conflict error when slug is already taken (409)', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`, {
      statusCode: 409,
      body: { status: 409, title: 'Conflict', detail: 'Slug already in use' },
    }).as('createClinic')

    visitBackoffice('/clinics/new', mockPlatformAdmin)
    fillClinicForm()
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.wait('@createClinic')
    cy.get('[data-testid="clinic-form-error"]').should('be.visible')
  })

  it('disables submit button while request is in flight', () => {
    cy.intercept('POST', `${Cypress.env('API_URL')}/clinics`, (req) => {
      req.reply({ delay: 2000, statusCode: 201, body: mockCreatedClinic })
    }).as('createClinic')

    visitBackoffice('/clinics/new', mockPlatformAdmin)
    fillClinicForm()
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.get('[data-testid="clinic-form-submit"]').should('be.disabled')
    cy.wait('@createClinic')
  })

  it('back button returns to /clinics', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: emptyListResponse,
    })

    visitBackoffice('/clinics/new', mockPlatformAdmin)
    cy.get('[data-testid="new-clinic-back-button"]').click()
    expectBackofficePath('/clinics')
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

    visitBackoffice('/clinics/new', mockPlatformAdmin)
    fillClinicForm()
    cy.get('[data-testid="clinic-form-submit"]').click()
    cy.wait('@createClinic')
    expectBackofficePath('/clinics')
    cy.wait('@getClinics')
    cy.get(`[data-testid="clinic-table-row-${mockCreatedClinic.id}"]`).should('exist')
  })

})

export {}
