// Contrato de roteamento que só o modo subdomínio exercita.
//
// Em modo path (a suíte inteira) o slug da clínica é o primeiro segmento do
// caminho, e qualquer código que pergunte "estou no backoffice?" olhando o
// pathname acerta por acidente. Sob subdomínio o middleware reescreve
// internamente e o pathname externo não tem prefixo nenhum — foi assim que a
// Sidebar passou a exibir a marca de clínica no backoffice em produção,
// com os 117 specs verdes.

import { CLINIC_SLUG, visitClinic, visitBackoffice, expectClinicPath } from '../../support/clinic'

const mockAdmin = { id: 'uuid-admin', fullName: 'Admin E2E', email: 'admin@e2e.test', role: 'admin' }

describe('Roteamento por subdomínio', () => {
  it('serve a clínica no seu próprio host, sem o slug no caminho', () => {
    visitClinic('/dashboard', mockAdmin)

    cy.location('hostname').should('eq', `${CLINIC_SLUG}.pulso.localhost`)
    expectClinicPath('/dashboard')
    cy.location('pathname').should('not.include', `/${CLINIC_SLUG}`)
  })

  it('constrói os links internos sem prefixo de slug', () => {
    visitClinic('/dashboard', mockAdmin)

    // useBasePath() devolve '' sob subdomínio e '/<slug>' em modo path. Um href
    // com o prefixo aqui significa que algum componente montou o link à mão.
    cy.get('nav a[href^="/"]').each((link) => {
      expect(link.attr('href')).not.to.match(new RegExp(`^/${CLINIC_SLUG}(/|$)`))
    })
  })

  // Regressão de F22 (rodada 4): a Sidebar decidia pelo pathname, que sob
  // subdomínio é '/clinics', não '/backoffice/clinics'.
  it('mostra a marca do Pulso no backoffice, não a de uma clínica', () => {
    visitBackoffice('/clinics')

    cy.location('hostname').should('eq', 'backoffice.pulso.localhost')

    // Depois da hidratação, não antes. A marcação do servidor está certa mesmo
    // com o bug — ele nasce quando o cliente assume com o pathname externo, que
    // não tem o prefixo /backoffice. Asserir cedo demais mede o servidor e passa
    // verde com a tela errada. Estes dois fetches partem do cliente, então
    // esperá-los garante que o React já reconciliou.
    cy.wait('@backofficeAuthMe')
    cy.wait('@backofficeThemes')

    cy.get('[data-testid="sidebar-logo"] img[alt="Pulso"]').should('have.length', 2)
    cy.get('[data-testid="sidebar-clinic-name"]').should('not.exist')
  })

  it('serve o site institucional no apex, não o app da clínica', () => {
    cy.request(Cypress.env('WEBSITE_URL')).then((response) => {
      expect(response.status).to.eq(200)
      // O app da clínica sob o apex redirecionaria para login ou 404aria; o
      // website é outra aplicação e não tem a sidebar autenticada.
      expect(response.body).not.to.include('data-testid="sidebar-logo"')
    })
  })

  it('responde a API no seu próprio subdomínio', () => {
    cy.request(`${Cypress.env('API_URL')}/health`).its('status').should('eq', 200)
  })
})
