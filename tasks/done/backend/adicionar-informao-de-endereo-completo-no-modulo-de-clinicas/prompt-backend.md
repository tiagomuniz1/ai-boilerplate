Você é um engenheiro de software sênior especialista na arquitetura deste projeto.

Sua tarefa é implementar exatamente o que está descrito abaixo.

Siga TODAS as regras e contexto definidos na task.

---
## INSTRUCTIONS
- Não inventar padrões
- Não ignorar regras
- Não simplificar a solução
- Código deve ser production-ready
- Seguir estritamente a arquitetura definida
- Se faltar informação, não inventar

---
## OUTPUT FORMAT
- Retorne APENAS código
- Não explique nada
- Use cabeçalhos de arquivo:
// caminho/do/arquivo.ts

---
## TASK
# Task — Adicionar Endereço Completo ao Módulo de Clínicas (Backend)

## Descrição
Adicionar informações de endereço completo à entidade `Clinic`, permitindo armazenar e gerenciar dados de localização (logradouro, número, complemento, bairro, cidade, estado, CEP e país). O endereço deve ser obrigatório na criação e atualizável via endpoint existente de update.

---

## Contexto

- Módulo `ClinicsModule` já existe — esta task estende a entidade e os DTOs existentes
- O endereço é parte integrante da clínica (relação 1:1 embutida) — não justifica um módulo separado por ora
- Campos seguem padrão brasileiro (CEP no formato `00000-000`, estado como sigla de 2 letras)
- Alteração de schema exige migration — `synchronize` está desligado
- Mudança breaking no contrato da API → coordenar com frontend via `packages/shared`

---

## Contratos

### Input (DTO)

`AddressDto` (em `packages/shared/src/dtos/`):
- street: string (obrigatório, max 255)
- number: string (obrigatório, max 20)
- complement: string | null (opcional, max 100)
- neighborhood: string (obrigatório, max 100)
- city: string (obrigatório, max 100)
- state: string (obrigatório, length 2, uppercase)
- zipCode: string (obrigatório, formato `00000-000`)
- country: string (obrigatório, default `BR`, length 2, uppercase)

`CreateClinicDto` (estender o existente):
- ...campos atuais
- address: AddressDto (obrigatório, `@ValidateNested` + `@Type(() => AddressDto)`)

`UpdateClinicDto` (estender o existente):
- ...campos atuais
- address: AddressDto (opcional, `@ValidateNested` + `@Type(() => AddressDto)`)

### Output

`ClinicResponse`:
- id: string
- name: string
- ...demais campos existentes
- address:
  - street: string
  - number: string
  - complement: string | null
  - neighborhood: string
  - city: string
  - state: string
  - zipCode: string
  - country: string
- createdAt: Date
- updatedAt: Date

---

## Assinaturas esperadas

**Use-cases (atualizar existentes):**

`CreateClinicUseCase.execute(dto: CreateClinicDto): Promise<Clinic>`
`UpdateClinicUseCase.execute(id: string, dto: UpdateClinicDto): Promise<Clinic>`
`FindClinicByIdUseCase.execute(id: string): Promise<Clinic>`
`FindAllClinicsUseCase.execute(pagination: PaginationDto): Promise<[Clinic[], number]>`

**Repositories (sem alteração de assinatura — a entity passa a expor os novos campos):**

`IClinicsRepository`:
- findAll(page: number, limit: number): Promise<[Clinic[], number]>
- findById(id: string): Promise<Clinic | null>
- create(data: CreateClinicDto, queryRunner?: QueryRunner): Promise<Clinic>
- update(id: string, data: UpdateClinicDto, queryRunner?: QueryRunner): Promise<Clinic>
- delete(id: string, queryRunner?: QueryRunner): Promise<void>

---

## Fluxo principal

### Create
1. Controller recebe `CreateClinicDto` validado (incluindo `address` aninhado)
2. `CreateClinicUseCase.execute()` é chamado
3. Use-case valida regras de negócio (ex: duplicidade de nome/CNPJ se aplicável)
4. Repository persiste a clínica com os novos campos de endereço
5. Cache de listagem é invalidado (`clinics:list*`)
6. Retorna a clínica criada com endereço

### Update
1. Controller recebe `UpdateClinicDto` validado
2. `UpdateClinicUseCase.execute()` busca a clínica existente
3. Se `address` foi enviado, sobrescreve os campos de endereço
4. Repository persiste a atualização
5. Cache invalidado (`clinic:${id}` e `clinics:list*`)
6. Retorna clínica atualizada

---

## Fluxos alternativos

- Clínica não encontrada no update → `NotFoundException('Clinic not found')`
- CEP fora do padrão `00000-000` → `BadRequestException` (capturado pelo `ValidationPipe`)
- Estado com mais ou menos de 2 caracteres → `BadRequestException`
- Campo obrigatório de endereço ausente no create → `BadRequestException`
- Conflito de versão (optimistic lock) → `ConflictException('Record was modified by another process. Please try again.')`

---

## Regras de negócio

- Endereço é **obrigatório** ao criar uma clínica
- No update, endereço é opcional — mas se enviado, todos os campos obrigatórios devem estar presentes (objeto completo, não merge parcial)
- `state` armazenado em **uppercase** (transform via `@Transform`)
- `country` armazenado em **uppercase**, default `BR`
- `zipCode` validado por regex `^\d{5}-\d{3}$`
- `complement` é o único campo opcional do endereço

---

## Dependências

- `IClinicsRepository` (existente)
- `CacheService` (para invalidação)
- `DataSource` (herdado de `BaseUseCase`)

---

## Decisões técnicas da task

- **Usar transação:** Não — operação atômica de uma única entidade (sem cascade entre módulos)
- **Usar distributed lock:** Não — não há contenção em recurso crítico compartilhado
- **Usar cache:** Sim — invalidar `clinic:${id}` e `clinics:list*` após mutations; consultas individuais e de listagem se beneficiam de cache (já implementado no módulo)
- **Estratégia de concorrência:** Optimistic Lock (`@VersionColumn`) — clínica é dado compartilhado de baixa contenção, edições simultâneas raras
- **Modelagem do endereço:** colunas embutidas na tabela `clinics` (não criar tabela `addresses`) — endereço é 1:1, sem reuso, sem histórico
- **Migration:** criar `add_address_to_clinics` com colunas novas; clínicas existentes ficam com colunas `NOT NULL` apenas após backfill — coordenar com produto antes do deploy
- **DTO compartilhado:** `AddressDto` em `packages/shared` — contrato usado por frontend e backend

---

## Restrições

- NÃO criar módulo separado de `Address` — embutir na entity `Clinic`
- NÃO usar `process.env` fora de `env.config.ts`
- NÃO logar dados de endereço em logs de erro (PII — apenas `clinicId`)
- NÃO permitir update parcial de endereço (objeto completo ou nada)
- NÃO usar `synchronize` — alteração de schema apenas via migration
- NÃO importar tipos do backend dentro do `packages/shared`

---

## Estrutura esperada

```
apps/backend/src/modules/clinics/
  controllers/
    clinics.controller.ts        (sem alteração estrutural)
  use-cases/
    create-clinic.use-case.ts    (atualizar)
    update-clinic.use-case.ts    (atualizar)
    find-clinic-by-id.use-case.ts
    find-all-clinics.use-case.ts
  repositories/
    clinics.repository.interface.ts
    clinics.repository.ts        (atualizar mapeamento)
  dto/
    create-clinic.dto.ts         (estender)
    update-clinic.dto.ts         (estender)
  entities/
    clinic.entity.ts             (adicionar colunas de endereço)
  tests/
    clinics.integration.spec.ts  (atualizar)

apps/backend/src/database/migrations/
  <timestamp>-add-address-to-clinics.ts

packages/shared/src/
  dtos/
    address.dto.ts               (novo)
  index.ts                       (exportar AddressDto)
```

---

## Cenários de teste adicionais

**Unitários:**
- Criar clínica com endereço completo → sucesso
- Criar clínica sem campo obrigatório de endereço → erro de validação
- Criar clínica com CEP inválido (`12345`, `123456789`) → erro
- Criar clínica com `state` em lowercase → persistido em uppercase
- Update sem `address` → mantém endereço original
- Update com `address` parcial (faltando campo obrigatório) → erro de validação
- Update com `OptimisticLockVersionMismatchError` → lança `ConflictException`
- Cache invalidado após create e update (verificar chamadas mockadas)

**Integração:**
- `POST /clinics` com endereço válido → 201 + retorna endereço completo
- `POST /clinics` sem endereço → 400
- `POST /clinics` com `zipCode` inválido → 400
- `PATCH /clinics/:id` atualizando apenas endereço → 200 + endereço atualizado
- `GET /clinics/:id` retorna endereço persistido corretamente
- `GET /clinics` retorna endereço em todos os itens da listagem
- Migration aplicada cria as colunas com tipos esperados

---

## Definition of Done

- [ ] `AddressDto` criado e exportado em `packages/shared`
- [ ] Entity `Clinic` atualizada com colunas de endereço
- [ ] Migration criada e testada (up e down)
- [ ] `CreateClinicDto` e `UpdateClinicDto` atualizados com validação aninhada
- [ ] Use-cases de create e update tratando endereço
- [ ] Repository persistindo e retornando endereço corretamente
- [ ] Cache invalidado após mutations
- [ ] Optimistic lock funcionando no update
- [ ] Testes unitários com 100% de cobertura
- [ ] Testes de integração cobrindo cenários acima
- [ ] Sem `process.env` fora de `env.config.ts`
- [ ] Sem dados sensíveis em logs
- [ ] Naming convention respeitada