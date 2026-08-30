// Pre-flight check for local Cypress E2E. Fails fast with an actionable message
// instead of letting Cypress die with a cryptic 404 when the local environment
// isn't the one the tests expect. Guards the two failure modes we actually hit:
//   1. the Pulso backend isn't up / the dev DB isn't seeded with the `pulso` clinic;
//   2. the frontend answering on baseUrl isn't the Pulso app (port taken by another
//      project, or the frontend simply isn't running) — every `/:slug` route 404s.
//
// Ports mirror cypress.config.ts (baseUrl 3000, API 3001) and can be overridden with
// E2E_BASE_URL / E2E_API_URL (e.g. when running the frontend on an alternate port).

const CLINIC_SLUG = 'pulso'

// Modo subdomínio (docker-compose.full.yml): a clínica vive no host, não no
// caminho, e a API tem subdomínio próprio. Sem isto o pré-voo checaria
// localhost:3000/pulso, que nesse modo não existe, e falharia com uma mensagem
// que aponta para o lugar errado.
const SUBDOMAIN_MODE = process.env.E2E_SUBDOMAIN_MODE === '1'
const BASE_DOMAIN = process.env.E2E_BASE_DOMAIN ?? 'pulso.localhost'

const DEFAULT_BASE_URL = SUBDOMAIN_MODE ? `http://${CLINIC_SLUG}.${BASE_DOMAIN}` : 'http://localhost:3000'
const DEFAULT_API_URL = SUBDOMAIN_MODE ? `http://api.${BASE_DOMAIN}` : 'http://localhost:3001'

const BASE_URL = (process.env.E2E_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '')
const API_URL = (process.env.E2E_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '')

// A página da clínica: sob subdomínio a raiz do host já é a clínica.
const CLINIC_PAGE_URL = SUBDOMAIN_MODE ? `${BASE_URL}/` : `${BASE_URL}/${CLINIC_SLUG}`

function fail(message) {
  console.error(`\n✖ E2E pre-flight failed:\n  ${message}\n`)
  process.exit(1)
}

async function main() {
  // 1. Backend up + dev DB seeded with the `pulso` clinic.
  let clinicRes
  try {
    clinicRes = await fetch(`${API_URL}/clinics/slug/${CLINIC_SLUG}`)
  } catch {
    fail(
      `Pulso backend not reachable at ${API_URL}.\n` +
        `  Start it with: docker compose up -d  (or: yarn workspace @app/backend dev)\n` +
        `  Override the URL with E2E_API_URL if it runs elsewhere.`,
    )
  }
  if (clinicRes.status !== 200) {
    fail(
      `${API_URL}/clinics/slug/${CLINIC_SLUG} returned ${clinicRes.status} (expected 200).\n` +
        `  The dev DB is likely not seeded — run: yarn workspace @app/backend seed:run`,
    )
  }

  // 2. The frontend on baseUrl is the Pulso app and resolves the clinic slug.
  //    A 404 here means the clinic layout's notFound() fired (wrong app on this port,
  //    or the frontend can't reach the backend). 200/redirects are fine.
  let pageRes
  try {
    pageRes = await fetch(CLINIC_PAGE_URL, { redirect: 'manual' })
  } catch {
    fail(
      `No frontend reachable at ${BASE_URL}.\n` +
        (SUBDOMAIN_MODE
          ? '  Start the full stack with: docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build\n'
          : '  Start it with: yarn workspace @app/frontend dev\n') +
        `  Override the URL with E2E_BASE_URL if it runs on another port.`,
    )
  }
  if (pageRes.status === 404) {
    fail(
      `${CLINIC_PAGE_URL} returned 404 — the app on ${BASE_URL} is not resolving the\n` +
        `  '${CLINIC_SLUG}' clinic. Either another project is occupying that port, or the Pulso\n` +
        `  frontend can't reach the backend (check NEXT_PUBLIC_API_URL = ${API_URL}).`,
    )
  }

  console.log(`✓ E2E pre-flight OK — backend ${API_URL} seeded, frontend ${BASE_URL} serving '${CLINIC_SLUG}'.`)
}

main()
