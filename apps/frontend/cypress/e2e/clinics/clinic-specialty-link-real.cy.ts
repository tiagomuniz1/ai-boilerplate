// Sem um import ou export, o TypeScript trata o arquivo como script e as
// constantes de topo passam a dividir o escopo global com as outras specs —
// PLATFORM_EMAIL e companhia colidiam entre nove arquivos.
export {}

// Stack real ponta a ponta — zero cobertura hoje. Vincular/desvincular
// especialidade pela UI da clínica (hoje só existia cobertura indireta via
// API, dentro de outros specs que precisavam de uma especialidade vinculada).

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Clinic specialty link — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('links a specialty to a clinic via the real UI, then unlinks it', () => {
    cy.seedClinic().then((clinic) => {
      cy.seedSpecialty().then((specialty) => {
        cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
        cy.visit(`/backoffice/clinics/${clinic.id}`)

        cy.get('[data-testid="clinic-specialty-section"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="clinic-specialty-empty"]').should('be.visible')

        cy.get('[data-testid="clinic-specialty-link-button"]').click()
        cy.get('[data-testid="clinic-specialty-link-modal"]').should('be.visible')
        cy.get('[data-testid="clinic-specialty-modal-search"]').type(specialty.name)
        cy.get(`[data-testid="clinic-specialty-modal-item-${specialty.id}"]`, { timeout: 10000 }).should('be.visible')
        cy.get(`[data-testid="clinic-specialty-modal-link-button-${specialty.id}"]`).click()

        cy.get('[data-testid="clinic-specialty-success"]', { timeout: 10000 }).should('be.visible')
        cy.get(`[data-testid="clinic-specialty-row-${specialty.id}"]`).should('exist')

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/clinics/${clinic.id}/specialties`,
          headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
        }).then((getResponse) => {
          expect(getResponse.body.data.some((s: any) => s.specialtyId === specialty.id)).to.eq(true)

          cy.get(`[data-testid="clinic-specialty-unlink-button-${specialty.id}"]`).click()
          cy.get('[data-testid="clinic-specialty-unlink-modal"]').should('be.visible')
          cy.get('[data-testid="clinic-specialty-unlink-confirm"]').click()

          cy.get(`[data-testid="clinic-specialty-row-${specialty.id}"]`, { timeout: 10000 }).should('not.exist')
          cy.get('[data-testid="clinic-specialty-empty"]').should('be.visible')

          cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
          cy.deleteSpecialtyViaApi(specialty.id, specialty.platformAdminToken)
        })
      })
    })
  })

  it('shows a real "no results" state when searching the link modal for a specialty that does not match', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="clinic-specialty-link-button"]', { timeout: 10000 }).click()
      cy.get('[data-testid="clinic-specialty-link-modal"]').should('be.visible')
      cy.get('[data-testid="clinic-specialty-modal-search"]').type(`Inexistente${Date.now()}`)
      cy.get('[data-testid="clinic-specialty-modal-empty"]', { timeout: 10000 }).should('be.visible')

      cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
    })
  })

  it('shows loading and error states for the linked specialties list (mocked)', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)

    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*/specialties*`, {
      statusCode: 200,
      body: { data: [], total: 0, page: 1, limit: 20 },
      delay: 500,
    }).as('getSpecialtiesSlow')
    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/00000000-0000-4000-9000-000000000001`, {
      statusCode: 200,
      body: {
        id: '00000000-0000-4000-9000-000000000001',
        name: 'Clínica Mock',
        slug: 'clinica-mock',
        isActive: true,
        plan: 'free',
        theme: null,
        address: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    })

    cy.visit('/backoffice/clinics/00000000-0000-4000-9000-000000000001')
    cy.get('[data-testid="clinic-specialty-loading"]').should('be.visible')
    cy.wait('@getSpecialtiesSlow')
    cy.get('[data-testid="clinic-specialty-loading"]').should('not.exist')

    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*/specialties*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getSpecialtiesError')
    cy.reload()
    cy.wait('@getSpecialtiesError')
    cy.get('[data-testid="clinic-specialty-list-error"]').should('be.visible')
  })
})
