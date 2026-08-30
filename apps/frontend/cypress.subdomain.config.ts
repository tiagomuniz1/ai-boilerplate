import { defineConfig } from 'cypress'
import baseConfig from './cypress.config'

// E2E contra a stack completa em modo subdomínio (docker-compose.full.yml), que
// reproduz a topologia de produção: nginx roteando por Host, COOKIE_DOMAIN
// escopado no domínio-pai, CORS entre subdomínios e o `website` no apex.
//
// Existe porque a suíte padrão roda inteira em modo path, e modo path não é o
// que produção usa. Dois bugs chegaram em produção justamente na diferença —
// a URL do QR da receita e a identificação do backoffice na Sidebar — e ambos
// passavam verdes em todos os 117 specs.
//
// Não duplica a suíte: regra de negócio já é coberta em modo path, e rodá-la
// duas vezes custa tempo sem cobrir nada novo. Aqui ficam só os casos que o
// modo path é incapaz de exercitar.
//
//   docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
//   yarn workspace @app/frontend cypress:run:subdomain
export default defineConfig({
  ...baseConfig,
  e2e: {
    ...baseConfig.e2e,
    // A clínica, não o apex: o apex serve o app institucional `website`, e um
    // cy.visit relativo a partir dele sairia da aplicação sob teste.
    baseUrl: 'http://pulso.pulso.localhost',
    // Support próprio: não herda o silenciador de erro de hidratação da suíte padrão.
    supportFile: 'cypress/support/e2e.subdomain.ts',
    specPattern: 'cypress/e2e/subdomain/**/*.cy.{ts,tsx}',
    // Anula a exclusão herdada do config base, que existe justamente para manter
    // estes specs fora da suíte padrão.
    excludeSpecPattern: [],
    env: {
      ...baseConfig.e2e?.env,
      API_URL: 'http://api.pulso.localhost',
      SUBDOMAIN_BASE_DOMAIN: 'pulso.localhost',
      WEBSITE_URL: 'http://pulso.localhost',
    },
  },
})
