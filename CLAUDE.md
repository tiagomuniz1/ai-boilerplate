# PROJECT CONTEXT

@ai/context/architecture.md

---

@ai/context/permissions.md

---

## Comandos

### Setup inicial

```bash
yarn install

# Configurar credenciais AWS (necessário para buscar variáveis do Parameter Store)
aws configure
```

### Infraestrutura local (Docker)

```bash
docker compose up -d
docker compose down
docker compose down -v  # reset completo do banco
```

### Banco de dados

```bash
yarn workspace @app/backend migration:run
yarn workspace @app/backend migration:generate src/database/migrations/nome_da_migration
yarn workspace @app/backend migration:revert
yarn workspace @app/backend seed:run
NODE_ENV=test yarn workspace @app/backend seed:run
```

### Desenvolvimento

```bash
yarn workspace @app/frontend dev
yarn workspace @app/backend dev
yarn dev  # frontend e backend em paralelo
```

### Build

```bash
yarn workspace @app/frontend build
yarn workspace @app/backend build
yarn build
```

### Testes

```bash
yarn workspace @app/frontend test:unit
yarn workspace @app/frontend test:integration
yarn workspace @app/frontend test
yarn workspace @app/frontend test:unit --coverage

yarn workspace @app/backend test:unit
yarn workspace @app/backend test:integration
yarn workspace @app/backend test
yarn workspace @app/backend test:unit --coverage

yarn test  # todos os testes do monorepo
```

### Testes E2E

```bash
yarn workspace @app/frontend cypress:run   # headless (CI/CD)
```

---

## Deploy

* Via **GitHub Actions** com **acionamento manual** (`workflow_dispatch`, nunca por push)
* Artefatos enviados para **ECR** e implantados numa instância **EC2** (via SSM Run Command rodando `docker compose`) — ver `docs/DEPLOY_RUNBOOK.md`
* Deploy nunca deve ser feito diretamente na máquina local
* **Ambiente único: `production`.** Não existe branch `develop` nem ambiente de staging na AWS — tudo que antes era validado em staging agora é validado localmente via Docker (ver "Infraestrutura local (Docker)" e "Testes E2E" abaixo) antes do deploy manual para produção a partir de `main`

---

## Versionamento

* Padrão: **Semantic Versioning** — `vMAJOR.MINOR.PATCH`
* Frontend e backend versionados de forma **independente**
* Versão registrada em dois lugares: **tag git** + **`package.json`** de cada app

| Tipo | Quando incrementar |
|---|---|
| `MAJOR` | Breaking change |
| `MINOR` | Nova funcionalidade compatível |
| `PATCH` | Correção de bug compatível |

Tags nomeadas com prefixo do projeto: `frontend/vMAJOR.MINOR.PATCH` e `backend/vMAJOR.MINOR.PATCH`

```bash
git tag frontend/v1.2.0 && git push origin frontend/v1.2.0
git tag backend/v2.0.1  && git push origin backend/v2.0.1
```

#### Fluxo de release

```
1. Desenvolver na branch feature/*
2. Testar localmente via Docker (stack completa — ver "Infraestrutura local")
3. Abrir PR para main
4. Atualizar version no package.json do app correspondente
5. Criar tag git com o formato correto
6. Acionar deploy manual via GitHub Actions → production
```

* Nunca fazer deploy sem criar a tag correspondente
* A versão no `package.json` deve sempre estar sincronizada com a tag git
* Manter um `CHANGELOG.md` por app registrando o que mudou em cada versão

---

@ai/context/backend.md

---

@ai/context/examples.md

---

@ai/context/frontend.md

---

## Shared (`packages/shared`)

```
packages/shared/src/
  dtos/     → Contratos de request/response da API
  types/    → Interfaces e types compartilhados
  enums/    → Enums usados nos dois projetos
  config/   → Configurações estáticas compartilhadas (ex: formato de validação por enum)
  utils/    → Funções puras sem dependência de framework
  index.ts  → Único ponto de exportação
```

* Tudo exportado via `index.ts` — nunca importar de subpastas diretamente
* DTOs do shared são o contrato entre frontend e backend — mudanças breaking precisam ser coordenadas
* Ao adicionar um campo obrigatório em um DTO, atualizar frontend e backend antes de fazer deploy
* Nunca importar tipos do `frontend` ou `backend` dentro do `shared`

---

## Testes E2E

* Biblioteca: **Cypress**
* Simulam fluxos reais do usuário — sem mockar comportamento crítico
* Rodam localmente antes de cada deploy para produção — não existe mais ambiente de staging na AWS. Fluxo diário: `docker compose up -d` (modo path, `localhost:3010/3011`). Antes de promover para produção: `docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build`, que sobe a stack completa (nginx + `website` + roteamento por subdomínio `*.pulso.localhost`), reproduzindo o que só staging validava antes (CORS entre subdomínios, `COOKIE_DOMAIN`, roteamento por `Host`)

```ts
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request('POST', `${Cypress.env('API_URL')}/auth/login`, { email, password })
})
```

### Duas suítes, dois modos de roteamento

A suíte padrão (`cypress:run`) roda inteira em **modo path** (`localhost:3000/pulso`). Produção usa **modo subdomínio** (`pulso.pulso.center`), e são contratos diferentes: sob subdomínio o slug vive no host, o middleware reescreve o caminho internamente, o cookie precisa do domínio-pai e as chamadas de API cruzam origem.

```bash
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --build
yarn workspace @app/frontend cypress:run:subdomain
```

* `cypress.subdomain.config.ts` roda apenas `cypress/e2e/subdomain/**` — regra de negócio já é coberta em modo path e rodá-la duas vezes não cobre nada novo. Ali ficam só os casos que o modo path é **incapaz** de exercitar
* Os helpers de `cypress/support/clinic.ts` (`visitClinic`, `visitBackoffice`, `expectClinicPath`) são mode-aware: leem `SUBDOMAIN_BASE_DOMAIN` e montam URL, domínio de cookie e asserção de caminho conforme o modo. Specs que os usam funcionam nos dois modos sem alteração
* **A suíte de subdomínio falha em erro de hidratação**, ao contrário da padrão, que os silencia em `cypress/support/e2e.ts`. Divergência entre o que o servidor renderizou e o que o cliente hidratou é a assinatura típica de um componente que decidiu algo pelo pathname — que o middleware reescreve no servidor mas não no browser. Foi assim que a Sidebar passou a exibir marca de clínica no backoffice em produção, com os 117 specs verdes
* Ao asserir algo que depende do modo, **espere a hidratação** (`cy.wait('@backofficeAuthMe')` e afins). Antes disso o DOM ainda é a marcação do servidor, que costuma estar correta mesmo quando o cliente erra — asserir cedo passa verde com a tela errada

* Sempre usar `data-testid` — nunca classes CSS ou texto
* Cada teste deve ser independente — sem depender do estado de outro teste
* **Cobertura obrigatória e completa — toda funcionalidade do frontend precisa de teste E2E, por menor que seja.** Não existe "funcionalidade pequena demais para testar": happy path, estados de erro/loading, validação de formulário, toggles, diálogos secundários, menus, widgets embutidos em outras telas — tudo entra. Uma funcionalidade nova só está pronta quando tem teste E2E cobrindo-a.
* Credenciais de teste via `cypress.env.json` — no `.gitignore`

---

## Segurança Geral

* Nunca confiar em dados vindos do cliente — sempre validar no backend
* Nunca logar dados sensíveis em nenhum ambiente (senhas, tokens, CPF, dados de cartão)
* Secrets sempre no Parameter Store — nunca em código-fonte
* Em caso de dúvida sobre expor um dado, não expor

---

## Definition of Done

### Código
* [ ] Implementação completa conforme requisitos
* [ ] Sem erros de build / warnings de lint / `console.log` ou código comentado

### Testes
* [ ] Testes unitários com 100% de cobertura
* [ ] Testes de integração para endpoints novos ou alterados
* [ ] Testes E2E para toda funcionalidade nova ou alterada — sem exceção de tamanho

### Padrões
* [ ] Segue arquitetura e naming convention
* [ ] Sem mistura de camadas
* [ ] Nenhum tipo do axios fora de `lib/api-client.ts` (frontend)
* [ ] Nenhum `process.env` fora de `env.config.ts` (backend)
* [ ] Dados da API gerenciados via React Query — nunca via Zustand

### Segurança
* [ ] Nenhum dado sensível em logs
* [ ] Nenhum secret em código-fonte ou `NEXT_PUBLIC_*`

### Processo
* [ ] PR aberto com descrição clara
* [ ] PR aprovado por pelo menos um revisor
* [ ] Branch atualizada com `develop` antes do merge
* [ ] `CHANGELOG.md` atualizado se for mudança relevante

---

## Code Review

### Bloqueantes
* Violação de arquitetura (camadas misturadas, axios fora do API Client, `process.env` fora de `env.config.ts`)
* Falta de testes ou cobertura incompleta
* Dados sensíveis em logs ou código
* Bug óbvio ou comportamento incorreto
* Violação de naming convention
* Dados da API armazenados em Zustand em vez de React Query

### Sugestões
* Preferência de estilo dentro das regras definidas
* Refatorações que não afetam comportamento
* Melhorias de legibilidade

* Todo PR deve ter no mínimo **1 aprovação** antes do merge
* Reviewer tem até **1 dia útil** para responder
