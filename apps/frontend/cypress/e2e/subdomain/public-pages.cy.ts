// Páginas públicas sob subdomínio.
//
// A verificação de receita é o caso que já quebrou em produção: o QR do rodapé
// do PDF levava a uma URL montada em modo path, e quem bipava caía numa tela de
// login em vez da verificação. O que importa aqui não é o conteúdo (coberto em
// modo path por prescription-verification-real) e sim que a rota resolve no
// subdomínio da clínica sem exigir sessão.

import { clinicUrl } from '../../support/clinic'

describe('Páginas públicas sob subdomínio', () => {
  beforeEach(() => {
    cy.clearCookies()
  })

  it('abre a verificação de receita sem autenticação', () => {
    const token = 'e2e-subdomain-token'

    cy.intercept('GET', `${Cypress.env('API_URL')}/prescriptions/verify/${token}`, {
      statusCode: 200,
      body: {
        clinicName: 'Pulso',
        professionalName: 'Dra. E2E',
        professionalCouncilType: 'CRM',
        professionalRegistrationNumber: '12345/PE',
        specialtyName: 'Geriatria',
        patientNameMasked: 'Maria S.',
        patientDocumentMasked: '***.***.789-**',
        issuedAt: '2026-08-01T10:00:00.000Z',
        items: [
          { name: 'Dipirona', activeIngredient: 'dipirona', dosage: '500mg', quantity: '1 caixa' },
        ],
      },
    }).as('verify')

    cy.visit(clinicUrl(`/verify/prescriptions/${token}`))

    cy.wait('@verify')
    cy.location('pathname').should('eq', `/verify/prescriptions/${token}`)
    cy.contains('Maria S.').should('be.visible')
  })

  it('abre a definição de senha sem autenticação', () => {
    cy.visit(clinicUrl('/set-password?token=e2e-subdomain-token'), { failOnStatusCode: false })

    cy.location('pathname').should('eq', '/set-password')
    cy.location('pathname').should('not.include', '/login')
  })
})
