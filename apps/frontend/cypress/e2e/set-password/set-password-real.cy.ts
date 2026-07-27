// Stack real ponta a ponta — nenhum teste hoje exercitava o primeiro acesso.
// O e-mail real com o token não é capturável em teste (SMTP_HOST não
// configurado no dev server só loga um warning e não envia — ver
// SendSetPasswordEmailUseCase), e a tabela só guarda o hash SHA-256 do token,
// nunca o valor em texto puro — por isso o token é inserido diretamente via
// cy.task('dbQuery'), com o hash calculado em SQL puro (sha256/encode do
// Postgres, sem depender de extensão) para bater exatamente com o algoritmo
// usado por SetPasswordUseCase (createHash('sha256').update(token).digest('hex')).

import { CLINIC_SLUG, CLINIC_ID } from '../../support/clinic'

const ADMIN_EMAIL = 'admin@pulso.center'
const ADMIN_PASSWORD = '123123123'

function randomToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '')
}

function insertPasswordSetToken(userId: string, token: string, expiresInMs: number) {
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString()
  return cy.task('dbQuery', {
    sql: `INSERT INTO password_set_tokens (id, user_id, clinic_id, token_hash, expires_at)
          VALUES ($1, $2, $3, encode(sha256(convert_to($4, 'UTF8')), 'hex'), $5)`,
    params: [crypto.randomUUID(), userId, CLINIC_ID, token, expiresAt],
  })
}

describe('Set password — real', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('sets a new password with a valid token and can log in with it afterwards', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      const ts = Date.now()
      cy.createUserViaApi(
        { fullName: `Convidado Real ${ts}`, email: `convidado.${ts}@e2e.test`, password: 'TemporaryPass123!', role: 'user' },
        adminToken,
      ).then((user) => {
        const token = randomToken()

        insertPasswordSetToken(user.id, token, 24 * 60 * 60 * 1000).then(() => {
          cy.clearCookies()
          cy.visit(`/${CLINIC_SLUG}/set-password?token=${token}`)

          cy.get('[data-testid="set-password-page"]', { timeout: 10000 }).should('be.visible')
          cy.get('[data-testid="set-password-email"]', { timeout: 10000 }).should('have.value', `convidado.${ts}@e2e.test`)

          cy.get('[data-testid="set-password-password"]').type('NovaSenhaReal123!')
          cy.get('[data-testid="set-password-confirm-password"]').type('NovaSenhaReal123!')
          cy.get('[data-testid="set-password-submit"]').click()

          cy.location('pathname', { timeout: 10000 }).should('eq', `/${CLINIC_SLUG}/login`)

          cy.loginAsClinicUser(`convidado.${ts}@e2e.test`, 'NovaSenhaReal123!', CLINIC_SLUG).then((newToken) => {
            expect(newToken).to.be.a('string')
            expect(newToken.length).to.be.greaterThan(10)

            cy.clearCookies()
            cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((cleanupAdminToken) => {
              cy.deleteUserViaApi(user.id, cleanupAdminToken)
            })
          })
        })
      })
    })
  })

  it('shows an invalid-token state for a token that does not exist', () => {
    cy.visit(`/${CLINIC_SLUG}/set-password?token=this-token-does-not-exist`)
    cy.get('[data-testid="set-password-invalid-token"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="set-password-password"]').should('not.exist')
  })

  it('shows a missing-token state when the URL has no ?token= at all', () => {
    cy.visit(`/${CLINIC_SLUG}/set-password`)
    cy.get('[data-testid="set-password-missing-token"]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="set-password-password"]').should('not.exist')
  })

  it('rejects reusing an already-used token', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      const ts = Date.now()
      cy.createUserViaApi(
        { fullName: `Convidado Reuso ${ts}`, email: `convidado.reuso.${ts}@e2e.test`, password: 'TemporaryPass123!', role: 'user' },
        adminToken,
      ).then((user) => {
        const token = randomToken()

        insertPasswordSetToken(user.id, token, 24 * 60 * 60 * 1000).then(() => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/auth/set-password`,
            body: { token, password: 'PrimeiraSenha123!' },
          }).then((firstResponse) => {
            expect(firstResponse.status).to.eq(204)

            // A validação de token (GET /auth/set-password/validate) já retorna
            // valid:false para um token usado — a UI nunca chega a mostrar o
            // formulário de novo, mostra o mesmo estado de "inválido". A rejeição
            // do reenvio em si é confirmada direto contra a API real abaixo.
            cy.clearCookies()
            cy.visit(`/${CLINIC_SLUG}/set-password?token=${token}`)
            cy.get('[data-testid="set-password-invalid-token"]', { timeout: 10000 }).should('be.visible')

            cy.request({
              method: 'POST',
              url: `${Cypress.env('API_URL')}/auth/set-password`,
              body: { token, password: 'SegundaSenha123!' },
              failOnStatusCode: false,
            }).then((secondResponse) => {
              expect(secondResponse.status).to.eq(422)
              expect(secondResponse.body.detail).to.contain('already used')

              cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((cleanupAdminToken) => {
                cy.deleteUserViaApi(user.id, cleanupAdminToken)
              })
            })
          })
        })
      })
    })
  })

  it('shows an expired-token error when the token is past its expiry', () => {
    cy.loginAsClinicUser(ADMIN_EMAIL, ADMIN_PASSWORD, CLINIC_SLUG).then((adminToken) => {
      const ts = Date.now()
      cy.createUserViaApi(
        { fullName: `Convidado Expirado ${ts}`, email: `convidado.expirado.${ts}@e2e.test`, password: 'TemporaryPass123!', role: 'user' },
        adminToken,
      ).then((user) => {
        const token = randomToken()

        // Negative expiry — already in the past, so /auth/set-password/validate
        // reports invalid (the UI can't tell "expired" from "unknown" apart; the
        // real distinction — 422 "Token expired" vs 404 "Token not found" — is
        // asserted directly against the API below).
        insertPasswordSetToken(user.id, token, -1000).then(() => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('API_URL')}/auth/set-password`,
            body: { token, password: 'QualquerSenha123!' },
            failOnStatusCode: false,
          }).then((response) => {
            expect(response.status).to.eq(422)
            expect(response.body.detail).to.contain('expired')

            cy.deleteUserViaApi(user.id, adminToken)
          })
        })
      })
    })
  })

  it('shows a validating spinner, then a generic error if the submit itself fails (mocked)', () => {
    cy.intercept('GET', `${Cypress.env('API_URL')}/auth/set-password/validate*`, {
      statusCode: 200,
      body: { valid: true, email: 'convidado.mock@e2e.test' },
      delay: 500,
    }).as('validateSlow')

    cy.visit(`/${CLINIC_SLUG}/set-password?token=any-token-mocked`)
    cy.get('[data-testid="set-password-validating"]').should('be.visible')
    cy.wait('@validateSlow')
    cy.get('[data-testid="set-password-validating"]').should('not.exist')
    cy.get('[data-testid="set-password-password"]').should('be.visible')

    cy.get('[data-testid="set-password-password"]').type('NovaSenhaReal123!')
    cy.get('[data-testid="set-password-confirm-password"]').type('NovaSenhaReal123!')

    cy.intercept('POST', `${Cypress.env('API_URL')}/auth/set-password`, {
      statusCode: 500,
      body: { type: 'https://httpstatuses.com/500', title: 'INTERNAL_SERVER_ERROR', status: 500, detail: 'Internal error' },
    }).as('submitError')
    cy.get('[data-testid="set-password-submit"]').click()
    cy.wait('@submitError')
    cy.get('[data-testid="set-password-error"]').should('be.visible')
  })
})
