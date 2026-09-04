import { defineConfig } from 'cypress'
import { Client } from 'pg'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{ts,tsx}',
    // A suíte de subdomínio exige a stack completa (docker-compose.full.yml) e
    // falha por construção em modo path: as URLs, o domínio do cookie e as
    // asserções de caminho são outros. Roda por cypress.subdomain.config.ts.
    excludeSpecPattern: 'cypress/e2e/subdomain/**/*.cy.{ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    // O padrão do Cypress é 4s, e há asserções da suíte que encostam nele numa
    // máquina ociosa — "disables submit button while request is in flight"
    // fechou em 3978ms. Qualquer carga concorrente (Docker, build, outro
    // navegador) empurra um conjunto diferente de specs para fora do limite a
    // cada execução, o que aparecia como falha aleatória e não como regressão.
    //
    // Um orçamento maior não esconde defeito: asserção errada continua falhando,
    // só demora mais para desistir.
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 15000,
    pageLoadTimeout: 60000,
    env: {
      API_URL: 'http://localhost:3001',
      DB_HOST: 'localhost',
      DB_PORT: 5499,
      DB_USER: 'postgres',
      DB_PASS: 'postgres',
      DB_NAME: 'app',
      DB_SCHEMA: 'dev',
    },
    setupNodeEvents(on, config) {
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--disable-dev-shm-usage')
        }

        if (browser.name === 'electron') {
          launchOptions.args.push('--disable-gpu')
          launchOptions.args.push('--no-sandbox')
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--disable-software-rasterizer')
          launchOptions.args.push('--disable-features=VizDisplayCompositor')
        }
        return launchOptions
      })

      // Direct DB access for the handful of E2E cases where no API response
      // exposes what the test needs to assert against (e.g. a prescription's
      // plaintext verification token, or seeding a password-set token to
      // simulate the email a real send would deliver). Never point this at
      // production — it refuses to connect if NODE_ENV says otherwise.
      on('task', {
        async dbQuery({ sql, params }: { sql: string; params?: unknown[] }) {
          if (process.env.NODE_ENV === 'production') {
            throw new Error('cy.task("dbQuery") refused: NODE_ENV is production')
          }

          const client = new Client({
            host: config.env.DB_HOST,
            port: config.env.DB_PORT,
            user: config.env.DB_USER,
            password: config.env.DB_PASS,
            database: config.env.DB_NAME,
            options: `-c search_path=${config.env.DB_SCHEMA}`,
          })

          await client.connect()
          try {
            const result = await client.query(sql, params)
            return result.rows
          } finally {
            await client.end()
          }
        },
      })
    },
  },
})
