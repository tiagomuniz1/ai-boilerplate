import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
}

function stubDashboard() {
  cy.intercept('GET', `${Cypress.env('API_URL')}/dashboard*`, {
    fixture: 'dashboard.json',
  }).as('getDashboard')
}

describe('Dashboard', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('redirects to /login when not authenticated', () => {
    cy.visit(`/${CLINIC_SLUG}/dashboard`)
    expectClinicPath('/login')
  })

  it('shows dashboard page when authenticated', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="dashboard"]').should('be.visible')
  })

  it('shows sidebar with navigation', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav"]').should('be.visible')
  })

  it('shows authenticated user info in sidebar', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar-user"]').should('be.visible')
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.fullName)
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.email)
  })

  it('sidebar navigation links to /users and /patients', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar-nav"]').within(() => {
      cy.get(`a[href="/${CLINIC_SLUG}/users"]`).should('exist')
      cy.get(`a[href="/${CLINIC_SLUG}/patients"]`).should('exist')
    })
  })

  it('renders KPI cards with values from API', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.wait('@getDashboard')
    cy.get('[data-testid="dashboard-kpi-scheduled"]').should('contain', '15')
    cy.get('[data-testid="dashboard-kpi-confirmed"]').should('contain', '6')
    cy.get('[data-testid="dashboard-kpi-completed"]').should('contain', '10')
    cy.get('[data-testid="dashboard-kpi-no-show"]').should('contain', '3')
  })

  it('renders chart cards', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.wait('@getDashboard')
    cy.get('[data-testid="dashboard-patients-chart"]').should('be.visible')
    cy.get('[data-testid="dashboard-procedures-chart"]').should('be.visible')
    cy.get('[data-testid="dashboard-insurance-chart"]').should('be.visible')
    cy.get('[data-testid="dashboard-duration-card"]').should('be.visible')
    cy.get('[data-testid="dashboard-timeline-chart"]').should('be.visible')
    cy.get('[data-testid="dashboard-age-distribution"]').should('be.visible')
  })

  it('renders birthday panel with today\'s birthdays', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.wait('@getDashboard')
    cy.get('[data-testid="dashboard-birthdays"]').should('be.visible')
    cy.get('[data-testid="dashboard-birthdays"]').should('contain', 'Ana Costa')
    cy.get('[data-testid="dashboard-birthdays"]').should('contain', 'João Silva')
  })

  it('renders date range filter', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="dashboard-date-range"]').should('be.visible')
    cy.get('[data-testid="dashboard-date-from"]').should('exist')
    cy.get('[data-testid="dashboard-date-to"]').should('exist')
  })

  it('refetches dashboard when date range changes', () => {
    stubDashboard()
    visitClinic('/dashboard', mockAuthUser)
    cy.wait('@getDashboard')

    cy.get('[data-testid="dashboard-date-from"]').clear().type('2026-01-05')
    cy.wait('@getDashboard')
    cy.get('@getDashboard.all').should('have.length', 2)
  })

  it('shows loading skeleton before data loads', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/dashboard*`, (req) => {
      req.reply({ fixture: 'dashboard.json', delay: 500 })
    }).as('getDashboardSlow')

    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="dashboard-loading"]').should('be.visible')
    cy.wait('@getDashboardSlow')
  })

  it('shows error state when API fails', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/dashboard*`, {
      statusCode: 500,
      body: { message: 'Internal Server Error' },
    }).as('getDashboardError')

    visitClinic('/dashboard', mockAuthUser)
    cy.wait('@getDashboardError')
    cy.get('[data-testid="dashboard-error"]').should('be.visible')
  })
})

export {}
