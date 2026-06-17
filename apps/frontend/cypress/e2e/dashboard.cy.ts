import { visitClinic, expectClinicPath, CLINIC_SLUG, CLINIC_ID } from '../support/clinic'

const mockAuthUser = {
  id: 'mock-auth-user-id',
  fullName: 'Mock Admin',
  email: 'mock@admin.com',
  role: 'admin',
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
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="dashboard"]').should('be.visible')
  })

  it('shows sidebar with navigation', () => {
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar"]').should('be.visible')
    cy.get('[data-testid="sidebar-nav"]').should('be.visible')
  })

  it('shows authenticated user info in sidebar', () => {
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar-user"]').should('be.visible')
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.fullName)
    cy.get('[data-testid="sidebar-user-info"]').should('contain', mockAuthUser.email)
  })

  it('sidebar navigation links to /users and /patients', () => {
    visitClinic('/dashboard', mockAuthUser)
    cy.get('[data-testid="sidebar-nav"]').within(() => {
      cy.get(`a[href="/${CLINIC_SLUG}/users"]`).should('exist')
      cy.get(`a[href="/${CLINIC_SLUG}/patients"]`).should('exist')
    })
  })
})

export {}
