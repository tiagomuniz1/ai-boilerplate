# Arquitetura do Projeto

## Monorepo

* Yarn Workspaces — um repositório, três packages:
  * `apps/frontend` → Next.js
  * `apps/backend` → NestJS
  * `packages/shared` → types, DTOs, utils compartilhados
  * `docker-compose.yml` → PostgreSQL e Redis locais

### Regras de dependência

* `frontend` e `backend` consomem `shared`
* `frontend` e `backend` nunca se importam diretamente entre si
* `shared` não contém lógica de negócio — apenas types, DTOs e utils puros

### Importando do shared

```ts
import { CreateUserDto } from '@app/shared'
import { UserRole } from '@app/shared'
```

---

## Shared (`packages/shared`)

```
packages/shared/src/
  dtos/     → Contratos de request/response da API
  types/    → Interfaces e types compartilhados
  enums/    → Enums usados nos dois projetos
  utils/    → Funções puras sem dependência de framework
  index.ts  → Único ponto de exportação
```

* Tudo exportado via `index.ts` — nunca importar de subpastas diretamente
* DTOs do shared são o contrato entre frontend e backend — mudanças breaking precisam ser coordenadas
* Nunca importar tipos do `frontend` ou `backend` dentro do `shared`
* Funções em `utils/` devem ser puras e testadas

---

## Branches

| Branch | Finalidade |
|---|---|
| `main` | Produção — sempre estável |
| `develop` | Integração contínua — base para features |
| `feature/*` | Nova funcionalidade |
| `fix/*` | Correção de bug |
| `hotfix/*` | Correção urgente em produção |

* Sempre em kebab-case: `feature/user-authentication`
* Nunca commitar diretamente em `main` ou `develop`
* Fluxo: `feature/* → develop → main`
* `hotfix/*` parte de `main` e vai para `main` + cherry-pick em `develop`

---

## Convenções Gerais

* Código em inglês
* Commits semânticos — Conventional Commits
* Arquivos em kebab-case
* **Nunca abreviar** — nomes completos e autoexplicativos
