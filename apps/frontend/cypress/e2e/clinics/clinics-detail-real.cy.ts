// Sem um import ou export, o TypeScript trata o arquivo como script e as
// constantes de topo passam a dividir o escopo global com as outras specs —
// PLATFORM_EMAIL e companhia colidiam entre nove arquivos.
export {}

// Stack real ponta a ponta — zero cobertura hoje: detalhe e edição de clínica
// no backoffice nunca foram testados, nem mockado nem real. Erro de 409 de
// slug duplicado também é provocado de verdade (módulo de maior risco —
// identidade de tenant), não só simulado.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Clinics — detail & update real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('shows real clinic data on the detail page and edits it for real', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="clinic-details"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="clinic-details-name"]').should('contain.text', clinic.name)
      cy.get('[data-testid="clinic-details-slug"]').should('contain.text', clinic.slug)
      cy.get('[data-testid="clinic-details-status"]').should('be.visible')

      cy.get('[data-testid="clinic-details-edit-button"]').click()
      cy.get('[data-testid="clinic-form"]', { timeout: 10000 }).should('be.visible')

      const updatedName = `${clinic.name} Editada`
      cy.get('[data-testid="clinic-form-name"]').clear().type(updatedName)
      cy.get('[data-testid="clinic-form-isactive"]').should('be.checked').uncheck()
      cy.get('[data-testid="clinic-form-submit"]').click()

      cy.location('pathname', { timeout: 10000 }).should('eq', `/backoffice/clinics/${clinic.id}`)
      cy.get('[data-testid="clinic-details-name"]', { timeout: 10000 }).should('contain.text', updatedName)
      cy.get('[data-testid="clinic-details-inactive-badge"]').should('be.visible')

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/clinics/${clinic.id}`,
        headers: { Authorization: `Bearer ${clinic.platformAdminToken}` },
      }).then((getResponse) => {
        expect(getResponse.body.name).to.eq(updatedName)
        expect(getResponse.body.isActive).to.eq(false)

        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })

  it('navigates to the new-clinic-user page via the "+ Usuário" button and creates a real user', () => {
    cy.seedClinic().then((clinic) => {
      cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
      cy.visit(`/backoffice/clinics/${clinic.id}`)

      cy.get('[data-testid="clinic-details"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="clinic-details-new-user-button"]').click()

      cy.location('pathname', { timeout: 10000 }).should('eq', `/backoffice/clinics/${clinic.id}/users/new`)
      cy.get('[data-testid="new-clinic-user-page"]').should('be.visible')

      const ts = Date.now()
      const fullName = `Usuário Via Botão ${ts}`
      const email = `usuario.via.botao.${ts}@e2e.test`
      cy.get('[data-testid="user-form-fullname"]').type(fullName)
      cy.get('[data-testid="user-form-email"]').type(email)
      cy.get('[data-testid="user-form-password"]').type('Password123!')
      cy.get('[data-testid="user-form-submit"]').click()

      cy.location('pathname', { timeout: 10000 }).should('eq', `/backoffice/clinics/${clinic.id}`)

      // GET /users is ADMIN-only (clinic-scoped) — PLATFORM_ADMIN can't list it,
      // so verify the real row directly against the database instead.
      cy.task('dbQuery', {
        sql: 'SELECT id, full_name, email FROM users WHERE email = $1',
        params: [email],
      }).then((rows: any) => {
        expect(rows).to.have.length(1)
        expect(rows[0].full_name).to.eq(fullName)

        cy.task('dbQuery', { sql: 'DELETE FROM users WHERE id = $1', params: [rows[0].id] })
        cy.deleteClinicViaApi(clinic.id, clinic.platformAdminToken)
      })
    })
  })

  it('rejects editing a clinic to a slug that is already in use by another clinic (409 real)', () => {
    cy.seedClinic().then((clinicA) => {
      cy.createClinicViaApi(
        { name: `Clínica B ${Date.now()}`, slug: `clinica-b-${Date.now()}` },
        clinicA.platformAdminToken,
      ).then((clinicB) => {
        cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
        cy.visit(`/backoffice/clinics/${clinicB.id}/edit`)

        cy.get('[data-testid="clinic-form"]', { timeout: 10000 }).should('be.visible')
        cy.get('[data-testid="clinic-form-slug"]').clear().type(clinicA.slug)
        cy.get('[data-testid="clinic-form-submit"]').click()

        cy.get('[data-testid="clinic-form-error"]', { timeout: 10000 }).should('be.visible')
        cy.location('pathname').should('eq', `/backoffice/clinics/${clinicB.id}/edit`)

        cy.deleteClinicViaApi(clinicB.id, clinicA.platformAdminToken)
        cy.deleteClinicViaApi(clinicA.id, clinicA.platformAdminToken)
      })
    })
  })

  it('shows load-error states on the detail and edit pages when the clinic fails to load (mocked)', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)

    cy.intercept('GET', `${Cypress.env('API_URL')}/clinics/*`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('getClinicError')

    cy.visit('/backoffice/clinics/00000000-0000-4000-9000-000000000000')
    cy.wait('@getClinicError')
    cy.get('[data-testid="clinic-details-load-error"]').should('be.visible')

    cy.visit('/backoffice/clinics/00000000-0000-4000-9000-000000000000/edit')
    cy.wait('@getClinicError')
    cy.get('[data-testid="edit-clinic-load-error"]').should('be.visible')
  })
})
