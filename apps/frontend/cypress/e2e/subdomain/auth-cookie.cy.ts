// Escopo de cookie e destino de redirect — os dois divergem entre os modos.
//
// Em modo path um único host serve todas as clínicas e o backoffice, então o
// escopo do cookie nunca é exercitado: qualquer domínio funciona. Sob subdomínio
// o cookie precisa valer no domínio-pai (COOKIE_DOMAIN) para sobreviver à
// navegação entre subdomínios, e o redirect de login precisa apontar para
// /login no host atual — não para /<slug>/login, que sob subdomínio nem existe.

import { CLINIC_SLUG, clinicUrl, backofficeUrl, visitClinic } from '../../support/clinic'

const mockAdmin = { id: 'uuid-admin', fullName: 'Admin E2E', email: 'admin@e2e.test', role: 'admin' }

describe('Autenticação sob subdomínio', () => {
  it('manda o visitante não autenticado para /login no próprio subdomínio', () => {
    cy.clearCookies()
    cy.visit(clinicUrl('/dashboard'), { failOnStatusCode: false })

    cy.location('hostname').should('eq', `${CLINIC_SLUG}.pulso.localhost`)
    cy.location('pathname').should('eq', '/login')
  })

  it('manda o backoffice não autenticado para o seu próprio /login', () => {
    cy.clearCookies()
    cy.visit(backofficeUrl('/clinics'), { failOnStatusCode: false })

    cy.location('hostname').should('eq', 'backoffice.pulso.localhost')
    cy.location('pathname').should('eq', '/login')
  })

  it('escopa o cookie da clínica no domínio-pai, para valer entre subdomínios', () => {
    visitClinic('/dashboard', mockAdmin)

    cy.getCookie(`access_token_${CLINIC_SLUG}`).should((cookie) => {
      expect(cookie, 'cookie da clínica').to.not.be.null
      expect(cookie!.domain).to.eq('.pulso.localhost')
    })
  })

  // O backoffice não é multi-tenant: usa `access_token` sem sufixo. Se os dois
  // compartilhassem nome, entrar numa clínica derrubaria a sessão do backoffice
  // — invisível em modo path, onde os testes nunca trocam de host.
  it('usa nomes de cookie distintos para clínica e backoffice', () => {
    visitClinic('/dashboard', mockAdmin)

    cy.getCookie(`access_token_${CLINIC_SLUG}`).should('not.be.null')
    cy.getCookie('access_token').should('be.null')
  })
})
