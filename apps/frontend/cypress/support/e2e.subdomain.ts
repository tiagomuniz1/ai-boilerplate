import './commands'

// A suíte padrão engole erros de hidratação (ver cypress/support/e2e.ts). Aqui
// não: divergência entre o que o servidor renderizou e o que o cliente hidratou
// é justamente a classe de bug que a reescrita por subdomínio produz, e é o
// motivo desta suíte existir.
//
// O caso concreto: a Sidebar decidia "estou no backoffice?" pelo pathname. O
// servidor renderiza a rota reescrita (`/backoffice/clinics`) e acerta; o cliente
// hidrata com o caminho externo (`/clinics`) e erra. O React reclama, o
// silenciador da suíte padrão descarta a reclamação, e a tela troca a marca do
// Pulso pela de uma clínica sem que teste nenhum perceba.
//
// Em build de produção as mensagens vêm minificadas, então casar apenas pelo
// texto ("Hydration failed") não basta — 418, 423, 425 e 426 são a família de
// hidratação.
const HYDRATION_ERROR = /Hydration failed|hydrating|server-rendered HTML|Minified React error #(418|423|425|426)\b/

Cypress.on('uncaught:exception', (err) => {
  if (HYDRATION_ERROR.test(err.message)) {
    throw new Error(
      'Divergência de hidratação: o servidor e o cliente renderizaram coisas diferentes ' +
        'nesta página. Sob subdomínio isso normalmente significa que algum componente ' +
        'decidiu algo pelo pathname, que o middleware reescreve no servidor mas não no ' +
        `browser.\n\nOriginal: ${err.message}`,
    )
  }
  return true
})
