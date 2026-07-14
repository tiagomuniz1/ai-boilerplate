# Task — Criar reverse proxy e docker-compose de produção

## Descrição

Criar o `docker-compose.prod.yml` que roda a stack de produção no EC2 (frontend, backend, Redis, migrate, proxy) e um **reverse proxy** (nginx) que escuta na porta 80 e **roteia por Host**: `api.pulso.center` → backend, demais subdomínios → frontend. O proxy é o **único origin do CloudFront**; o TLS termina no CloudFront, então o proxy fala HTTP puro. O Postgres **não** está no compose (fica no RDS).

---

## Contexto

- O `docker-compose.yml` atual builda backend+frontend e sobe postgres+redis+mailpit — é o template local, mas com secrets inline, portas expostas e `build:` (não `image:`).
- Decisões que moldam o compose de prod:
  - **Imagens vêm do ECR** (`image:`), buildadas no CI (não `build:` no EC2).
  - **Postgres no RDS** → remover serviço `postgres` e volume `postgres_data`; `DB_HOST` vem do SSM.
  - **Redis fica** no container (cache/lock efêmero), sem porta no host.
  - **Env via SSM** no boot (entrypoint do backend) — sem secrets no arquivo.
  - **Migrations** via serviço one-shot `migrate` antes do backend.
  - Backend rotas na raiz; API em `api.pulso.center` (roteamento por Host, sem prefixo `/api`).
- Depende de: imagens Docker prontas (task de imagens), entrypoint SSM (task de Parameter Store), `migration:run:prod` (task de migrations).

---

## Escopo

### 1. Reverse proxy nginx (novo, `infra/proxy/nginx.conf`)

Dois server blocks, roteando por `Host`, escutando `:80`:

```nginx
# API — host dedicado, rotas do Nest na raiz (sem rewrite de /api)
server {
  listen 80;
  server_name api.pulso.center;
  location / {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;   # TLS terminou no CloudFront
    proxy_set_header Origin $http_origin;
  }
}

# Frontend — qualquer outro subdomínio (clínicas + backoffice.pulso.center) via default
server {
  listen 80 default_server;
  server_name _;
  location / {
    proxy_pass http://frontend:3000;
    proxy_set_header Host $host;                  # middleware deriva o slug daqui
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

- Sem TLS, sem Let's Encrypt (CloudFront cuida). `X-Forwarded-Proto https` para o app entender que a request original é HTTPS (cookies `Secure`).

### 2. `docker-compose.prod.yml` (novo, raiz)

Serviços:

| Serviço | Imagem/origem | Notas |
|---|---|---|
| `proxy` | nginx:alpine + `nginx.conf` montado | **única** porta publicada: `80:80` |
| `frontend` | ECR `pulso-frontend:<tag>` | `restart: unless-stopped`; sem porta no host |
| `backend` | ECR `pulso-backend:<tag>` | entrypoint SSM; `depends_on: migrate (service_completed_successfully)`; `restart: unless-stopped` |
| `migrate` | ECR `pulso-backend:<tag>` | `entrypoint: ["sh","apps/backend/scripts/migrate.sh"]` (load-env SSM → bootstrap-schema → `migration:run`, sem `yarn` na imagem mínima); `restart: "no"`; aponta pro RDS via SSM |
| `redis` | `redis:7-alpine` | volume `redis_data`; sem porta no host; `restart: unless-stopped` |

- **Sem** `postgres`, **sem** `postgres_data`, **sem** `mailpit`.
- Sem secrets inline — o backend/migrate carregam env do SSM no boot; passar só o mínimo não-sensível (`NODE_ENV`, `PORT`, `AWS_REGION`) se necessário para o `load-env.js` achar o path.
- Versionar `docker-compose.prod.yml` e `infra/proxy/nginx.conf` no repo (o CI/EC2 sincroniza — ver task de pipeline).

**Arquivos:** `docker-compose.prod.yml` (novo), `infra/proxy/nginx.conf` (novo).

---

## Decisões técnicas

- **Roteamento por Host no nginx** (não por path no CloudFront): mantém a config de roteamento num só lugar, portável para ECS/ALB depois; o CloudFront fica com um único origin e um único behavior dinâmico.
- **nginx** em vez de Caddy: como o TLS é do CloudFront, o auto-TLS do Caddy não agrega; nginx é mais leve.
- **`migrate` como serviço separado** (não no entrypoint do backend): roda uma vez, com dependência explícita, e não atrasa/retrutura cada restart do backend.
- **Só o proxy publica porta**: reduz superfície; o Security Group ainda restringe a 80 ao prefix list do CloudFront.

---

## Restrições

- NÃO publicar portas de `backend`, `frontend`, `redis` no host — só o `proxy:80`.
- NÃO colocar secrets no `docker-compose.prod.yml`.
- NÃO incluir `postgres`/`mailpit` no compose de prod.
- NÃO terminar TLS no nginx (é responsabilidade do CloudFront).
- Manter o `docker-compose.yml` de dev intacto.

---

## Definition of Done

- [x] `infra/proxy/nginx.conf` roteando `api.pulso.center` → backend e default → frontend, encaminhando `Host`/`Origin`/`X-Forwarded-Proto`.
- [x] `docker-compose.prod.yml` com `proxy`, `frontend`, `backend`, `migrate`, `redis`; imagens do ECR (`${ECR_REGISTRY}/...:${IMAGE_TAG}`); sem postgres/mailpit; `restart` nos long-running.
- [x] Só o `proxy` publica `80:80` (confirmado: backend/frontend/redis sem binding no host).
- [x] Localmente (Postgres temporário via override no scratchpad + imagens buildadas): `migrate` completa (exit 0, 24 tabelas no schema `prod`), `curl -H "Host: api.pulso.center" localhost/health` → **200**, `curl -H "Host: c1.pulso.center" localhost/` → frontend em **subdomain-mode** (redireciona p/ `https://backoffice.pulso.center/login`), `backoffice.pulso.center/login` → **200 HTML**.
- [x] Sem secrets no arquivo; env carregado via SSM no boot (fallback gracioso no teste local sem credencial).

> **Execução (2026-07-13):**
> - **Arquivos:** `infra/proxy/nginx.conf` (2 server blocks por Host, HTTP puro, `X-Forwarded-Proto https`, `X-Forwarded-For/Host`, `Origin`) e `docker-compose.prod.yml` (proxy/frontend/backend/migrate/redis; imagens via `${ECR_REGISTRY}/pulso-*:${IMAGE_TAG:-latest}`; `migrate` com `entrypoint` do `migrate.sh`; `depends_on` com `service_healthy`/`service_completed_successfully`; só o proxy publica `80:80`).
> - **Validação local** via override no scratchpad (adiciona Postgres temporário + env inline, já que não há SSM local) com `docker compose -p pulsoprodtest -f docker-compose.prod.yml -f <override> up`. Stack completa subiu na ordem correta (postgres→migrate→backend healthy→frontend→proxy).
> - **Bug pré-existente encontrado e corrigido (middleware):** o `middleware.ts` derivava o host de `request.nextUrl.hostname`, que no Next standalone atrás de proxy resolve para `localhost` → subdomain-mode **nunca** funcionaria em produção (caía em path-mode). Corrigido para ler o header `host` (`request.headers.get('host')`, sem porta). Sem regressão em dev (`localhost` → path-mode como antes). **Não** é regressão da task 4 (a fonte do hostname não havia mudado). Cross-ref: task `ajustar-auth-para-multidominio-com-api-dedicada`.
> - **Gap corrigido no `apps/frontend/Dockerfile`:** faltava `ARG NEXT_PUBLIC_BASE_DOMAIN` (sem ele a imagem de prod ficaria em path-mode mesmo passando o build-arg). Adicionado `ARG`+`ENV`. A task 9 (CI) deve passar `--build-arg NEXT_PUBLIC_BASE_DOMAIN=pulso.center` e `--build-arg NEXT_PUBLIC_API_URL=https://api.pulso.center`.
> - O 404 em `c1.pulso.center/login` no teste é **esperado** (clínica "c1" não existe no DB de teste; o `[slug]/layout.tsx` faz `notFound()` p/ slug inexistente) — o roteamento e o rewrite `/login`→`/c1/login` funcionaram.
