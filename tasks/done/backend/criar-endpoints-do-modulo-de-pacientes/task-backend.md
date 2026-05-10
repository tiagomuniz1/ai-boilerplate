# Task — Módulo de Pacientes (Backend)

## Descrição
Implementar o módulo de pacientes (`patients`) com endpoints REST para criação, listagem, busca por ID, atualização e remoção (soft delete) de pacientes. Esse módulo será a base para os fluxos clínicos que dependem de dados cadastrais do paciente.

---

## Contexto

- O paciente é uma entidade central do domínio clínico — outros módulos (consultas, prontuários) referenciarão `Patient.id`.
- O cadastro deve ser único por `documentNumber` (CPF) — não permitir duplicidade entre pacientes ativos.
- Soft delete é o padrão — pacientes deletados não devem aparecer em listagens nem em buscas, mas o registro deve permanecer no banco para integridade histórica.
- Atualização de dados cadastrais deve usar **Optimistic Lock** (`@VersionColumn`), pois é dado compartilhado com baixo custo de conflito.
- Listagem deve ser paginada utilizando o `PaginationDto` em `common/dto/`.

---

## Contratos

### Input (DTOs)

CreatePatientDto:
- fullName: string (obrigatório, 3–120 chars)
- documentNumber: string (obrigatório, 11 chars, somente dígitos)
- email: string (obrigatório, formato email)
- phoneNumber: string (obrigatório, E.164)
- birthDate: string (obrigatório, ISO 8601 date)
- gender: enum `Gender` ('male' | 'female' | 'other')

UpdatePatientDto:
- fullName?: string (3–120 chars)
- email?: string
- phoneNumber?: string
- birthDate?: string (ISO 8601 date)
- gender?: enum `Gender`

ListPatientsQueryDto (estende `PaginationDto`):
- page?: number (default 1)
- limit?: number (default 20, max 100)
- search?: string (opcional, busca por `fullName` ou `documentNumber`)

### Output

PatientResponse:
- id: string (uuid)
- fullName: string
- documentNumber: string
- email: string
- phoneNumber: string
- birthDate: string (ISO 8601 date)
- gender: Gender
- createdAt: string (ISO 8601)
- updatedAt: string (ISO 8601)

ListPatientsResponse:
- data: PatientResponse[]
- total: number
- page: number
- limit: number

---

## Assinaturas esperadas

**Use-cases:**

CreatePatientUseCase.execute(dto: CreatePatientDto): Promise<Patient>
ListPatientsUseCase.execute(query: ListPatientsQueryDto): Promise<{ data: Patient[]; total: number; page: number; limit: number }>
FindPatientByIdUseCase.execute(id: string): Promise<Patient>
UpdatePatientUseCase.execute(id: string, dto: UpdatePatientDto): Promise<Patient>
DeletePatientUseCase.execute(id: string): Promise<void>

**Repositories:**

IPatientsRepository:
- findAll(page: number, limit: number, search?: string): Promise<[Patient[], number]>
- findById(id: string): Promise<Patient | null>
- findByDocumentNumber(documentNumber: string): Promise<Patient | null>
- create(data: CreatePatientDto, queryRunner?: QueryRunner): Promise<Patient>
- update(id: string, data: UpdatePatientDto, queryRunner?: QueryRunner): Promise<Patient>
- delete(id: string, queryRunner?: QueryRunner): Promise<void>

**Adapters:** Nenhum nesta task.

---

## Fluxo principal

**CreatePatient:**
1. Controller recebe `CreatePatientDto` validado.
2. Use-case verifica se já existe paciente com o mesmo `documentNumber` via `findByDocumentNumber`.
3. Se não existir, cria o paciente via `repository.create()`.
4. Invalida cache de listagem (`patients:list`).
5. Retorna o paciente criado.

**ListPatients:**
1. Controller recebe `ListPatientsQueryDto`.
2. Use-case tenta buscar do cache (chave dependente de `page`, `limit`, `search`).
3. Em miss, busca via `repository.findAll()`.
4. Salva no cache com TTL de 60s.
5. Retorna `{ data, total, page, limit }`.

**FindPatientById:**
1. Use-case tenta buscar do cache (`patient:${id}`).
2. Em miss, busca via `repository.findById()`.
3. Se não encontrar, lança `NotFoundException`.
4. Salva no cache com TTL de 300s.
5. Retorna paciente.

**UpdatePatient:**
1. Use-case busca paciente via `repository.findById()`.
2. Se não existir, lança `NotFoundException`.
3. Atualiza via `repository.update()`.
4. Captura `OptimisticLockVersionMismatchError` → lança `ConflictException`.
5. Invalida cache (`patient:${id}` e `patients:list`).
6. Retorna paciente atualizado.

**DeletePatient:**
1. Use-case busca paciente via `repository.findById()`.
2. Se não existir, lança `NotFoundException`.
3. Executa soft delete via `repository.delete()`.
4. Invalida cache (`patient:${id}` e `patients:list`).
5. Retorna `void` (HTTP `204`).

---

## Fluxos alternativos

- `documentNumber` já cadastrado em outro paciente ativo → `ConflictException('Patient with this document number already exists')`
- Paciente não encontrado em find/update/delete → `NotFoundException('Patient not found')`
- Conflito de versão em update → `ConflictException('Record was modified by another process. Please try again.')`
- Falha de invalidação de cache → log `warn` e seguir o fluxo normalmente.

---

## Regras de negócio

- `documentNumber` deve ser único entre pacientes ativos (não deletados).
- `documentNumber` é imutável — não pode ser atualizado via `UpdatePatientDto`.
- `birthDate` não pode ser futura.
- Soft delete obrigatório — nunca remover fisicamente.
- Listagem retorna apenas pacientes não deletados (TypeORM filtra automaticamente via `@DeleteDateColumn`).

---

## Dependências

- `IPatientsRepository` (interface + implementação `PatientsRepository`)
- `CacheService`

---

## Decisões técnicas da task

- **Usar transação:** Não — todas as operações são atômicas em uma única tabela.
- **Usar distributed lock:** Não — não há concorrência crítica de recursos.
- **Usar cache:** Sim — em `FindPatientById` (`patient:${id}`, TTL 300s) e `ListPatients` (`patients:list:${page}:${limit}:${search ?? 'all'}`, TTL 60s). Invalidação explícita em create/update/delete.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` na entidade `Patient`, conforme padrão para dados cadastrais.

---

## Restrições

- NÃO acessar `process.env` fora de `env.config.ts`.
- NÃO permitir alteração de `documentNumber`.
- NÃO logar `documentNumber`, `email` ou `phoneNumber` em logs de erro.
- NÃO usar hard delete.
- NÃO instanciar repositories diretamente — usar injeção via interface.
- NÃO colocar regra de negócio no controller.
- NÃO validar manualmente DTOs no use-case — confiar no `ValidationPipe`.

---

## Estrutura esperada

modules/patients/
- controllers/
  - patients.controller.ts
- use-cases/
  - create-patient.use-case.ts
  - list-patients.use-case.ts
  - find-patient-by-id.use-case.ts
  - update-patient.use-case.ts
  - delete-patient.use-case.ts
- repositories/
  - patients.repository.interface.ts
  - patients.repository.ts
- dto/
  - create-patient.dto.ts
  - update-patient.dto.ts
  - list-patients-query.dto.ts
- entities/
  - patient.entity.ts
- tests/
  - patients.integration.spec.ts
- patients.module.ts

---

## Cenários de teste adicionais

- Criar paciente com `documentNumber` já existente → `409 Conflict`.
- Criar paciente com `birthDate` futura → `400 Bad Request`.
- Listagem com `search` retornando filtro por `fullName` parcial.
- Listagem com `search` filtrando por `documentNumber` exato.
- Listagem paginada com `limit` acima de 100 → `400 Bad Request`.
- Atualizar paciente concorrentemente → segundo update recebe `409 Conflict`.
- Deletar paciente e em seguida buscar por ID → `404 Not Found`.
- Tentar atualizar `documentNumber` (campo extra) → `400 Bad Request` por `forbidNonWhitelisted`.
- Cache hit em `FindPatientById` não chama o repository.
- Invalidação de cache após update remove tanto `patient:${id}` quanto `patients:list`.
- Falha no `cacheService.del` durante invalidação → fluxo continua e retorna sucesso.

---

## Definition of Done

- [ ] Fluxo principal implementado para todos os endpoints (`POST`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`)
- [ ] Fluxos alternativos tratados com exceções nativas do NestJS
- [ ] Optimistic Lock funcionando via `@VersionColumn`
- [ ] Soft delete funcionando via `@DeleteDateColumn`
- [ ] Cache-aside implementado em leituras e invalidação em mutations
- [ ] Migration criada para a tabela `patients`
- [ ] Testes unitários (100% de cobertura)
- [ ] Testes de integração para todos os endpoints
- [ ] Naming convention respeitada
- [ ] Sem dados sensíveis em logs