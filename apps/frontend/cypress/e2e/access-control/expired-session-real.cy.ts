// Stack real — sessão expirada precisa terminar no login, e ficar lá.
//
// O sintoma em produção era "clico numa tela e sou jogado no dashboard". A
// causa: `POST /auth/refresh` devolvia 401 sem limpar os cookies que ele mesmo
// invalidava. O cliente ia para /login, a página de login via o `access_token`
// ainda presente e devolvia para o dashboard, que chamava a API, tomava 401 e
// recomeçava — até o navegador cortar por excesso de redirecionamentos.
//
// Nenhum mock aqui de propósito: o cookie é httpOnly e só o backend consegue
// apagá-lo, então o contrato só existe contra o servidor de verdade.

import { visitClinic, expectClinicPath } from '../../support/clinic'

const mockAdmin = {
  id: 'expired-session-user',
  fullName: 'Admin User',
  email: 'admin@clinic.com',
  role: 'admin',
}

describe('Access control — expired session (real)', () => {
  beforeEach(() => {
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  it('lands on the login form instead of bouncing between login and dashboard', () => {
    // `visitClinic` grava um access_token falso e nenhum refresh_token — o que
    // um usuário com sessão morta tem no navegador.
    visitClinic('/medical-record-templates', mockAdmin)

    expectClinicPath('/login')
    cy.get('[data-testid="login-form"]').should('be.visible')

    // A prova de que o loop acabou: o cookie que a página de login consultava
    // para devolver ao dashboard não existe mais.
    cy.getCookie('access_token_pulso').should('be.null')
    cy.getCookie('refresh_token_pulso').should('be.null')

    // E continua no login depois de assentar, em vez de escapar para o dashboard.
    cy.wait(1000)
    expectClinicPath('/login')
  })
})

export {}
