# Task — Upload de Logomarca e Favicon da Clínica (Backend)

## Descrição
Implementar suporte a upload e armazenamento de logomarca e favicon no módulo de clínicas. Ambos os arquivos são armazenados no AWS S3 e suas URLs públicas são persistidas na entidade `Clinic`. Quando nenhum arquivo estiver cadastrado, os campos retornam `null` e o frontend exibe o comportamento atual.

**Pré-requisito:** módulo de clínicas existente com endpoint `GET /clinics/me` e `PATCH /clinics/:id`.

---

## Contexto
- Cada clínica pode ter logomarca e favicon opcionalmente associados.
- Os arquivos são enviados via `multipart/form-data`, processados em memória (sem gravar em disco) e enviados diretamente ao S3.
- As URLs públicas do S3 são salvas em `logo_url` e `favicon_url` na tabela `clinics`.
- PLATFORM_ADMIN pode fazer upload para qualquer clínica via `POST /clinics/:id/logo` e `POST /clinics/:id/favicon`.
- ADMIN pode fazer upload da própria clínica via `POST /clinics/me/logo` e `POST /clinics/me/favicon` (clinicId extraído do JWT).
- Enviar um novo arquivo substitui o anterior (sem manter histórico).

---

## Contratos

### Input

**Upload de logo (multipart/form-data):**
- `logo`: arquivo de imagem (obrigatório)
  - Tipos aceitos: `image/jpeg`, `image/png`, `image/webp`
  - Tamanho máximo: 2MB

**Upload de favicon (multipart/form-data):**
- `favicon`: arquivo de imagem (obrigatório)
  - Tipos aceitos: `image/x-icon`, `image/png`, `image/svg+xml`
  - Tamanho máximo: 512KB

### Output

**ClinicResponseDto** (atualização em `packages/shared`):
- Adicionar campo: `logoUrl: string | null`
- Adicionar campo: `faviconUrl: string | null`

---

## Assinaturas esperadas

**Use-cases:**
- `UploadClinicLogoUseCase.execute(clinicId: string, file: Express.Multer.File): Promise<ClinicResponseDto>`
- `UploadClinicFaviconUseCase.execute(clinicId: string, file: Express.Multer.File): Promise<ClinicResponseDto>`

**IStorageAdapter:**
- `upload(buffer: Buffer, path: string, mimeType: string): Promise<string>` — retorna a URL pública

**IClinicsRepository** (adições):
- `updateLogo(id: string, logoUrl: string, queryRunner?: QueryRunner): Promise<void>`
- `updateFavicon(id: string, faviconUrl: string, queryRunner?: QueryRunner): Promise<void>`

---

## Fluxo principal

**POST /clinics/:id/logo** (PLATFORM_ADMIN)
1. Controller recebe o arquivo via `multer` (`memoryStorage`).
2. Valida tipo MIME e tamanho — `UnprocessableEntityException` se inválido.
3. Use-case busca a clínica — `NotFoundException` se não existir.
4. Gera o path no S3: `clinics/{clinicId}/logo.{ext}` (sobrescreve o anterior).
5. Envia o arquivo ao S3 via `StorageAdapter`.
6. Persiste a URL retornada em `clinic.logo_url`.
7. Invalida cache `clinic:${clinicId}` e `clinics:list*`.
8. Retorna `ClinicResponseDto` atualizado com `logoUrl`.

**POST /clinics/me/logo** (ADMIN / DOCTOR / USER)
1. Extrai `clinicId` do JWT via `@CurrentUser()`.
2. Delega para `UploadClinicLogoUseCase.execute(clinicId, file)`.
3. Mesmo fluxo do endpoint acima a partir do passo 2.

**POST /clinics/:id/favicon** (PLATFORM_ADMIN)
1. Controller recebe o arquivo via `multer` (`memoryStorage`).
2. Valida tipo MIME e tamanho — `UnprocessableEntityException` se inválido.
3. Use-case busca a clínica — `NotFoundException` se não existir.
4. Gera o path no S3: `clinics/{clinicId}/favicon.{ext}`.
5. Envia o arquivo ao S3 via `StorageAdapter`.
6. Persiste a URL retornada em `clinic.favicon_url`.
7. Invalida cache `clinic:${clinicId}` e `clinics:list*`.
8. Retorna `ClinicResponseDto` atualizado com `faviconUrl`.

**POST /clinics/me/favicon** (ADMIN / DOCTOR / USER)
1. Extrai `clinicId` do JWT via `@CurrentUser()`.
2. Delega para `UploadClinicFaviconUseCase.execute(clinicId, file)`.
3. Mesmo fluxo do endpoint acima a partir do passo 2.

---

## Fluxos alternativos

- Arquivo ausente na requisição → `400 Bad Request`
- Tipo MIME inválido (logo) → `UnprocessableEntityException('Invalid file type. Accepted: jpeg, png, webp')`
- Tipo MIME inválido (favicon) → `UnprocessableEntityException('Invalid file type. Accepted: ico, png, svg')`
- Tamanho excedido (logo) → `UnprocessableEntityException('File too large. Maximum size is 2MB')`
- Tamanho excedido (favicon) → `UnprocessableEntityException('File too large. Maximum size is 512KB')`
- Clínica não encontrada → `NotFoundException('Clinic not found')`
- Falha no upload ao S3 → propagar erro (sem silenciar — o arquivo não foi salvo)
- Falha na invalidação do cache → logar `warn` e seguir o fluxo

---

## Regras de negócio

- O arquivo substitui o anterior sem necessidade de deletar o arquivo antigo no S3 (mesmo path — o S3 sobrescreve automaticamente).
- Path no S3 da logo: `clinics/{clinicId}/logo.{ext}` onde `ext` é derivado do `mimeType` (`image/jpeg` → `jpg`, `image/png` → `png`, `image/webp` → `webp`).
- Path no S3 do favicon: `clinics/{clinicId}/favicon.{ext}` onde `ext` é derivado do `mimeType` (`image/x-icon` → `ico`, `image/png` → `png`, `image/svg+xml` → `svg`).
- A URL armazenada é a URL pública do objeto no S3 (sem expiração).
- Validação de tipo e tamanho ocorre no use-case, não apenas no `multer` — garante comportamento consistente independente de configuração do middleware.

---

## Dependências

- `multer` + `@types/multer` (upload de arquivo em memória)
- `@aws-sdk/client-s3` (upload para S3)
- `CacheService` (invalidação)
- `IClinicsRepository` (atualização das URLs)

---

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `AWS_S3_BUCKET` | Nome do bucket onde os arquivos são armazenados |
| `AWS_REGION` | Região AWS (ex: `us-east-1`) |

Adicionar ao `env.config.ts` e ao Parameter Store.

---

## Decisões técnicas da task

- **Storage:** `memoryStorage` do multer — sem arquivo em disco, compatível com ECS sem estado local.
- **S3 path fixo:** sobrescrever no mesmo path evita acúmulo de arquivos antigos sem necessidade de cleanup.
- **Transação:** Não — operação única na tabela `clinics`.
- **Cache:** Invalidar `clinic:${id}` e `clinics:list*` após upload bem-sucedido.
- **StorageAdapter:** interface + implementação S3 — desacoplado para teste unitário com mock.
- **Use-cases separados:** `UploadClinicLogoUseCase` e `UploadClinicFaviconUseCase` — responsabilidades distintas (tipos, tamanhos e paths diferentes).

---

## Restrições

- NÃO gravar o arquivo em disco no servidor.
- NÃO acessar `process.env` diretamente — usar `env.config.ts`.
- NÃO retornar a URL do S3 sem antes persistir no banco.
- NÃO implementar deleção do arquivo antigo no S3 (sobrescrição pelo mesmo path é suficiente).
- NÃO expor os endpoints de upload sem autenticação.

---

## Migration

```sql
ALTER TABLE clinics
  ADD COLUMN logo_url    VARCHAR(500) NULL,
  ADD COLUMN favicon_url VARCHAR(500) NULL;
```

---

## Estrutura esperada

```
modules/clinics/
  controllers/
    clinics.controller.ts             → POST /me/logo, POST /:id/logo, POST /me/favicon, POST /:id/favicon
  use-cases/
    upload-clinic-logo.use-case.ts
    upload-clinic-favicon.use-case.ts
  repositories/
    clinics.repository.interface.ts   → adicionar updateLogo() e updateFavicon()
    clinics.repository.ts             → implementar updateLogo() e updateFavicon()
  tests/
    upload-clinic-logo.use-case.spec.ts
    upload-clinic-favicon.use-case.spec.ts
    clinics.integration.spec.ts       → adicionar cenários de upload

common/adapters/
  storage.adapter.interface.ts
  storage.adapter.ts                  → implementação S3

packages/shared/src/dtos/
  clinic-response.dto.ts              → adicionar logoUrl e faviconUrl
```

---

## Cenários de teste adicionais

**Logo:**
- Upload com arquivo válido (JPEG, PNG, WebP) → retorna `ClinicResponseDto` com `logoUrl` preenchida
- Upload com tipo inválido (PDF) → `422 Unprocessable Entity`
- Upload com arquivo maior que 2MB → `422 Unprocessable Entity`
- Upload sem arquivo → `400 Bad Request`
- Segunda chamada → `logoUrl` atualizada (arquivo anterior sobrescrito)

**Favicon:**
- Upload com arquivo válido (ICO, PNG, SVG) → retorna `ClinicResponseDto` com `faviconUrl` preenchida
- Upload com tipo inválido (JPEG) → `422 Unprocessable Entity`
- Upload com arquivo maior que 512KB → `422 Unprocessable Entity`
- Upload sem arquivo → `400 Bad Request`
- Segunda chamada → `faviconUrl` atualizada

**Permissões (ambos os endpoints):**
- `POST /clinics/me/logo` e `/me/favicon` por PLATFORM_ADMIN → `403 Forbidden`
- `POST /clinics/:id/logo` e `/:id/favicon` por ADMIN → `403 Forbidden`
- Upload para clínica inexistente (PLATFORM_ADMIN) → `404 Not Found`
- Sem autenticação → `401 Unauthorized`

---

## Definition of Done

- [ ] Colunas `logo_url` e `favicon_url` adicionadas à entidade `Clinic` e migration criada
- [ ] `ClinicResponseDto` em `packages/shared` com campos `logoUrl` e `faviconUrl`
- [ ] `StorageAdapter` (interface + implementação S3) criado em `common/adapters/`
- [ ] `UploadClinicLogoUseCase` implementado com validação de tipo e tamanho
- [ ] `UploadClinicFaviconUseCase` implementado com validação de tipo e tamanho
- [ ] `IClinicsRepository.updateLogo()` e `updateFavicon()` implementados
- [ ] Endpoints de logo e favicon implementados (PLATFORM_ADMIN e me)
- [ ] Variáveis `AWS_S3_BUCKET` e `AWS_REGION` adicionadas ao `env.config.ts`
- [ ] Testes unitários com 100% de cobertura para ambos os use-cases
- [ ] Testes de integração cobrindo todos os cenários de upload
- [ ] Sem `process.env` fora de `env.config.ts`
- [ ] Sem arquivo gravado em disco no servidor
