import { visitBackoffice, expectBackofficePath } from '../../support/clinic'

const mockPlatformAdmin = {
  id: 'mock-platform-admin-id',
  fullName: 'Platform Admin',
  email: 'platform@pulso.center',
  role: 'platform_admin',
  clinicId: null,
}

const mockClinic = {
  id: 'cccccccc-0000-0000-0000-000000000001',
  name: 'Clínica do Coração',
  slug: 'clinica-do-coracao',
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-16T10:00:00.000Z',
}

const emptyListResponse = { data: [], total: 0, page: 1, limit: 20 }
const populatedListResponse = { data: [mockClinic], total: 1, page: 1, limit: 20 }

describe('Clinics List', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit('/backoffice/clinics')
    expectBackofficePath('/login')
  })

  it('shows skeleton during data fetch', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, (req) => {
      req.reply({ delay: 1500, statusCode: 200, body: populatedListResponse })
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.get('[data-testid="clinic-list-skeleton"]').should('be.visible')
    cy.wait('@getClinics')
    cy.get('[data-testid="clinic-list-skeleton"]').should('not.exist')
  })

  it('shows empty state when no clinics exist', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')
    cy.get('[data-testid="clinic-list-empty"]').should('be.visible')
    cy.get('[data-testid="clinic-list-table"]').should('not.exist')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 500,
      body: { title: 'Internal Server Error' },
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')
    cy.get('[data-testid="clinic-list-error"]').should('be.visible')
  })

  it('shows clinic rows with name, slug and status', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')

    cy.get('[data-testid="clinic-list-table"]').should('be.visible')
    cy.get(`[data-testid="clinic-table-row-${mockClinic.id}"]`).should('exist')
    cy.get(`[data-testid="clinic-name-${mockClinic.id}"]`).should('contain', mockClinic.name)
    cy.get(`[data-testid="clinic-slug-${mockClinic.id}"]`).should('contain', mockClinic.slug)
    cy.get(`[data-testid="clinic-status-${mockClinic.id}"]`).should('contain', 'Ativa')
  })

  it('shows "+ Usuário" shortcut link for each clinic', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')

    cy.get(`[data-testid="clinic-add-user-link-${mockClinic.id}"]`)
      .should('be.visible')
      .and('have.attr', 'href', `/backoffice/clinics/${mockClinic.id}/users/new`)
  })

  it('shows "Nova clínica" button linking to /clinics/new', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: emptyListResponse,
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')
    cy.get('[data-testid="clinic-list-new-button"]').should('be.visible').click()
    expectBackofficePath('/clinics/new')
  })

  it('filters the clinic list by typing in the search field', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('getClinics')

    visitBackoffice('/clinics', mockPlatformAdmin)
    cy.wait('@getClinics')

    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics*search=coracao*`, {
      statusCode: 200,
      body: populatedListResponse,
    }).as('searchClinics')
    cy.get('[data-testid="clinic-list-search"]').type('coracao')
    cy.wait('@searchClinics')
    cy.get(`[data-testid="clinic-table-row-${mockClinic.id}"]`).should('exist')
  })

})

export {}
