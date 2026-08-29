// Sem um import ou export, o TypeScript trata o arquivo como script e as
// constantes de topo passam a dividir o escopo global com as outras specs —
// PLATFORM_EMAIL e companhia colidiam entre nove arquivos.
export {}

// Stack real ponta a ponta — happy path (create/edit/toggle) nunca bateu no
// backend real; a suíte existente é toda mockada.

const PLATFORM_EMAIL = 'platform@pulso.center'
const PLATFORM_PASSWORD = '123123123'

describe('Canonical fields — happy path real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('creates, edits and deactivates a canonical field via the real UI', () => {
    cy.login(PLATFORM_EMAIL, PLATFORM_PASSWORD)
    cy.visit('/backoffice/canonical-fields/new')
    cy.get('[data-testid="canonical-field-form"]', { timeout: 10000 }).should('be.visible')

    const ts = Date.now()
    const canonicalKey = `campo_real_${ts}`
    const label = `Campo Real ${ts}`
    cy.get('[data-testid="canonical-field-form-canonical-key"]').type(canonicalKey)
    cy.get('[data-testid="canonical-field-form-label"]').type(label)
    cy.get('[data-testid="canonical-field-form-type"]').select('text')
    cy.get('[data-testid="canonical-field-form-submit"]').click()

    cy.location('pathname', { timeout: 10000 }).should('eq', '/backoffice/canonical-fields')

    cy.getCookie('access_token').then((cookie) => {
      const platformToken = cookie!.value

      cy.request({
        method: 'GET',
        url: `${Cypress.env('API_URL')}/medical-record-canonical-fields`,
        headers: { Authorization: `Bearer ${platformToken}` },
      }).then((listResponse) => {
        const created = listResponse.body.find((f: any) => f.canonicalKey === canonicalKey)
        expect(created).to.exist

        cy.get(`[data-testid="canonical-field-row-${created.id}"]`).should('exist')

        cy.get(`[data-testid="canonical-field-edit-link-${created.id}"]`).click()
        cy.get('[data-testid="canonical-field-form"]', { timeout: 10000 }).should('be.visible')
        const updatedLabel = `${label} Editado`
        cy.get('[data-testid="canonical-field-form-label"]').clear().type(updatedLabel)

        // update-canonical-field não redireciona nem mostra aviso — só limpa o
        // erro. Sincroniza pelo PATCH real em vez de por navegação/mensagem.
        cy.intercept('PATCH', `${Cypress.env('API_URL')}/medical-record-canonical-fields/${created.id}`).as('updateField')
        cy.get('[data-testid="canonical-field-form-submit"]').click()
        cy.wait('@updateField').its('response.statusCode').should('eq', 200)

        cy.visit('/backoffice/canonical-fields')
        cy.get(`[data-testid="canonical-field-toggle-button-${created.id}"]`, { timeout: 10000 }).click()
        cy.get('[data-testid="canonical-field-toggle-dialog-confirm"]').should('be.visible').click()

        cy.request({
          method: 'GET',
          url: `${Cypress.env('API_URL')}/medical-record-canonical-fields?includeInactive=true`,
          headers: { Authorization: `Bearer ${platformToken}` },
        }).then((allResponse) => {
          const updated = allResponse.body.find((f: any) => f.id === created.id)
          expect(updated.label).to.eq(updatedLabel)
          expect(updated.isActive).to.eq(false)
        })
      })
    })
  })
})
