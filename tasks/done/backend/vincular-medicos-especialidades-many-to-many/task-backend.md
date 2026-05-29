# Task — Vincular Médicos e Especialidades (NxN)

## Descrição

Substituir o campo de texto `specialty` na entidade `Doctor` por um relacionamento ManyToMany com a entidade `Specialty`. Um médico pode ter uma ou mais especialidades; uma especialidade pode pertencer a múltiplos médicos.

---

## Contexto

- A entidade `Doctor` possui atualmente `specialty: string` (texto livre).
- O módulo `Specialty` já existe e está operacional com CRUD completo.
- A junction table a ser criada é `doctor_specialties`.
- A migration deve migrar os dados existentes: para cada doctor, buscar a specialty pelo nome (case-insensitive) na tabela `specialties`; se não existir, criar; depois inserir o vínculo na junction table e por fim remover a coluna `specialty` de `doctors`.
- `specialtyIds` no create é obrigatório e deve conter ao menos 1 UUID válido.
- No update, `specialtyIds` é opcional; quando fornecido, **substitui** todo o conjunto de especialidades do médico.
- Campos `version` e `deletedAt` nunca expostos na resposta.

---

## Contratos

### Input (DTOs — `packages/shared`)

**CreateDoctorDto** — alterar campo `specialty`:
```diff
- specialty: string  (min 3, max 100)
+ specialtyIds: string[]  (array de UUIDs, @IsUUID('4', { each: true }), @ArrayMinSize(1))
```

**UpdateDoctorDto** — alterar campo `specialty`:
```diff
- specialty?: string  (min 3, max 100)
+ specialtyIds?: string[]  (array de UUIDs, @IsUUID('4', { each: true }), @ArrayMinSize(1), opcional)
```

### Output (DTOs — `packages/shared`)

**DoctorSpecialtyDto** (novo):
- `id: string` (uuid)
- `name: string`

**DoctorResponseDto** — alterar campo `specialty`:
```diff
- specialty: string
+ specialties: DoctorSpecialtyDto[]
```

---

## Assinaturas esperadas

**`ISpecialtiesRepository`** — adicionar método:
- `findByIds(ids: string[]): Promise<Specialty[]>`

**`IDoctorsRepository`** — sem mudança de assinatura, mas `create` e `update` passam a persistir a relação ManyToMany.

**Use-cases** — todos os métodos `toResponse()` passam a mapear `doctor.specialties` para `DoctorSpecialtyDto[]`:
- `CreateDoctorUseCase.execute(dto: CreateDoctorDto): Promise<DoctorResponseDto>`
- `FindAllDoctorsUseCase.execute(query, currentUser): Promise<PaginatedDoctorsResponseDto>`
- `FindDoctorByIdUseCase.execute(id, currentUser): Promise<DoctorResponseDto>`
- `UpdateDoctorUseCase.execute(id, dto, currentUser): Promise<DoctorResponseDto>`
- `DeleteDoctorUseCase.execute(id): Promise<void>`

---

## Fluxo principal

**POST /doctors**
1. Valida que o `userId` existe.
2. Valida que o usuário não possui perfil de médico.
3. Valida que o `crmNumber` não está em uso.
4. Busca todas as `Specialty` pelos `specialtyIds` via `ISpecialtiesRepository.findByIds()`.
5. Se qualquer ID não for encontrado → `UnprocessableEntityException('One or more specialty IDs not found')`.
6. Cria o `Doctor` com a relação de especialidades.
7. Invalida cache `doctors:list*`.
8. Retorna `DoctorResponseDto` com status `201`.

**GET /doctors** e **GET /doctors/:id**
- Nenhuma mudança de lógica, apenas o campo `specialty` na resposta passa a ser `specialties: DoctorSpecialtyDto[]`.
- O repository deve carregar a relação `specialties` via `relations: ['specialties']` (ou eager loading).

**PATCH /doctors/:id**
1. Verificação de autorização (DOCTOR só atualiza o próprio).
2. Busca o doctor — `NotFoundException` se não existir.
3. Valida CRM se fornecido.
4. Se `specialtyIds` for fornecido:
   - Busca as `Specialty` pelos IDs.
   - Se qualquer ID não for encontrado → `UnprocessableEntityException('One or more specialty IDs not found')`.
5. Atualiza o doctor (optimistic lock). Se `specialtyIds` fornecido, substitui todo o conjunto de especialidades.
6. Invalida `doctor:${id}` e `doctors:list*`.
7. Retorna `DoctorResponseDto` com status `200`.

**DELETE /doctors/:id**
- Sem mudança de lógica. O TypeORM remove os registros da junction table automaticamente ao soft-deletar o doctor (o cascade de deleção é apenas na junction table, não na `Specialty`).

---

## Fluxos alternativos

- Um ou mais `specialtyIds` não encontrados → `UnprocessableEntityException('One or more specialty IDs not found')`
- `specialtyIds` vazio (`[]`) no create ou update → `400 Bad Request` (validação `@ArrayMinSize(1)` no DTO)
- UUID inválido em `specialtyIds` → `400 Bad Request` (validação `@IsUUID('4', { each: true })` no DTO)
- Conflito de versão no update → `ConflictException('Record was modified by another process. Please try again.')`
- Demais fluxos de erro existentes permanecem inalterados

---

## Regras de negócio

- Um médico deve ter ao menos uma especialidade.
- Atualizar `specialtyIds` substitui **todo** o conjunto — não é aditivo.
- Soft delete no `Doctor` não afeta as `Specialty` — apenas os registros na junction table são removidos (cascade na FK de `doctor_id`).
- A junction table não possui soft delete — é uma tabela de associação pura.

---

## Permissões

Sem mudança em relação ao módulo atual:

| Ação | ADMIN | DOCTOR | USER |
|---|:---:|:---:|:---:|
| Criar | ✓ | ✗ | ✗ |
| Listar | ✓ todos | só o próprio | ✓ todos (leitura) |
| Ver por ID | ✓ | só o próprio | ✓ (leitura) |
| Editar | ✓ qualquer | só o próprio | ✗ |
| Excluir | ✓ | ✗ | ✗ |

---

## Dependências

- `ISpecialtiesRepository` (existente — adicionar `findByIds`)
- `SpecialtiesModule` deve ser exportado e importado por `DoctorsModule`
- `CacheService` (existente)

---

## Decisões técnicas da task

- **Junction table:** `doctor_specialties` com colunas `doctor_id UUID` e `specialty_id UUID`. FK em `doctor_id` com `ON DELETE CASCADE` (ao deletar o doctor, remove os vínculos). FK em `specialty_id` sem cascade (não queremos deletar especialidades ao remover um médico).
- **Eager loading:** Não usar `eager: true` na relação — carregar via `relations: ['specialties']` explicitamente no repository para controle explícito.
- **Atualização ManyToMany:** Usar `QueryBuilder` com `relation().add()`/`.remove()` ou simplesmente reatribuir `doctor.specialties = foundSpecialties` e salvar. A abordagem de reatribuição e `save()` é preferida por ser mais simples e legível.
- **Transação:** Não necessária — criar/atualizar um `Doctor` com suas specialties é uma operação atômica no TypeORM via `save()`.
- **Migração de dados:** A migration deve: (1) criar a junction table; (2) para cada `doctor`, buscar ou criar a `specialty` correspondente pelo texto atual; (3) inserir o vínculo; (4) dropar a coluna `specialty` de `doctors`.
- **Estratégia de migração do campo texto:** Usar `ILike` / `LOWER()` para match case-insensitive. Se o texto não existir em `specialties`, inserir com `name = valor_atual` e `description = null`.

---

## Restrições

- NÃO usar `eager: true` — carregar relações explicitamente.
- NÃO retornar a entidade crua — sempre mapear para `DoctorResponseDto`.
- NÃO expor `version` ou `deletedAt` na resposta.
- NÃO realizar hard delete.
- NÃO acessar `ISpecialtiesRepository` fora de use-cases.
- NÃO usar `process.env` fora de `env.config.ts`.

---

## Estrutura de arquivos modificados

```
packages/shared/src/dtos/
  create-doctor.dto.ts        ← substituir specialty por specialtyIds
  update-doctor.dto.ts        ← substituir specialty por specialtyIds
  doctor-response.dto.ts      ← substituir specialty por specialties + novo DoctorSpecialtyDto

apps/backend/src/modules/
  specialties/
    repositories/
      specialties.repository.interface.ts   ← adicionar findByIds
      specialties.repository.ts             ← implementar findByIds
      specialties.repository.spec.ts        ← testar findByIds

  doctors/
    entities/
      doctor.entity.ts                      ← remover specialty, adicionar @ManyToMany specialties
    repositories/
      doctors.repository.ts                 ← atualizar queries para relations: ['specialties']
      doctors.repository.spec.ts            ← atualizar specs
    use-cases/
      create-doctor.use-case.ts             ← validar specialtyIds, associar specialties
      update-doctor.use-case.ts             ← idem + substituição do conjunto
      find-all-doctors.use-case.ts          ← atualizar toResponse()
      find-doctor-by-id.use-case.ts         ← atualizar toResponse()
      delete-doctor.use-case.ts             ← sem mudança de lógica
    tests/
      create-doctor.use-case.spec.ts        ← atualizar mocks e assertions
      update-doctor.use-case.spec.ts        ← idem
      find-all-doctors.use-case.spec.ts     ← idem
      find-doctor-by-id.use-case.spec.ts    ← idem
      doctors.integration.spec.ts           ← atualizar payloads e assertions

  doctors/doctors.module.ts                 ← importar SpecialtiesModule (ou o repository via forwardRef)

apps/backend/src/database/migrations/
  <timestamp>-migrate-doctor-specialty-to-many-to-many.ts   ← nova migration
```

---

## Migration

Criar migration com timestamp em `src/database/migrations/`:

```sql
-- 1. Criar a junction table
CREATE TABLE IF NOT EXISTS "doctor_specialties" (
  "doctor_id"    UUID NOT NULL,
  "specialty_id" UUID NOT NULL,
  CONSTRAINT "PK_doctor_specialties" PRIMARY KEY ("doctor_id", "specialty_id"),
  CONSTRAINT "FK_doctor_specialties_doctor"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_doctor_specialties_specialty"
    FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id")
);

-- 2. Migrar dados: para cada doctor ativo, buscar ou criar specialty pelo nome
--    (implementar em TypeScript no método up() usando queryRunner.query)

-- 3. Remover coluna specialty da tabela doctors
ALTER TABLE "doctors" DROP COLUMN "specialty";
```

> **Nota:** O passo 2 deve ser implementado em TypeScript dentro do `up()` da migration. O algoritmo é:
> 1. `SELECT id, specialty FROM doctors WHERE deleted_at IS NULL` — obter todos os médicos ativos com o texto atual.
> 2. Para cada valor distinto de `specialty`, buscar em `specialties` por `LOWER(name) = LOWER($1)`.
> 3. Se não encontrar, inserir em `specialties` com `name = valor`, `description = NULL`.
> 4. Para cada `(doctor_id, specialty_id)`, inserir em `doctor_specialties`.

**Down:**
```sql
-- 1. Recriar coluna specialty em doctors
ALTER TABLE "doctors" ADD COLUMN "specialty" VARCHAR;

-- 2. Popular com o primeiro vínculo de cada doctor (simplificado)
UPDATE "doctors" d
SET "specialty" = (
  SELECT s.name FROM "doctor_specialties" ds
  JOIN "specialties" s ON s.id = ds.specialty_id
  WHERE ds.doctor_id = d.id
  LIMIT 1
);

-- 3. Tornar NOT NULL após popular
ALTER TABLE "doctors" ALTER COLUMN "specialty" SET NOT NULL;

-- 4. Dropar junction table
DROP TABLE IF EXISTS "doctor_specialties";
```

---

## Cenários de teste adicionais

**Unitários (use-cases):**
- `CreateDoctorUseCase`: `specialtyIds` com IDs válidos → cria doctor com specialties associadas
- `CreateDoctorUseCase`: algum `specialtyId` não encontrado → `UnprocessableEntityException`
- `CreateDoctorUseCase`: `specialtyIds` com IDs duplicados → aceita (deduplicação ou idempotência na associação)
- `UpdateDoctorUseCase`: `specialtyIds` fornecido → substitui todo o conjunto
- `UpdateDoctorUseCase`: `specialtyIds` não fornecido → mantém especialidades atuais
- `UpdateDoctorUseCase`: algum `specialtyId` não encontrado → `UnprocessableEntityException`
- `FindAllDoctorsUseCase`: resposta contém `specialties: DoctorSpecialtyDto[]` e não `specialty: string`
- `FindDoctorByIdUseCase`: resposta contém `specialties: DoctorSpecialtyDto[]`

**Repositório:**
- `SpecialtiesRepository.findByIds`: retorna apenas os IDs encontrados (IDs inválidos não geram erro no repo — validação feita no use-case)
- `DoctorsRepository.findAll`: retorna doctors com relação `specialties` carregada
- `DoctorsRepository.findById`: retorna doctor com relação `specialties` carregada

**Integração:**
- `POST /doctors` com `specialtyIds` válidos → `201` com `specialties` no body
- `POST /doctors` com `specialtyIds` contendo ID inexistente → `422 Unprocessable Entity`
- `POST /doctors` com `specialtyIds: []` → `400 Bad Request`
- `POST /doctors` com UUID inválido em `specialtyIds` → `400 Bad Request`
- `POST /doctors` sem campo `specialty` (campo antigo) → `400 Bad Request` (whitelist)
- `PATCH /doctors/:id` com `specialtyIds` → substitui especialidades, retorna `200`
- `PATCH /doctors/:id` sem `specialtyIds` → mantém especialidades existentes
- `GET /doctors` → cada doctor retorna `specialties` (array) em vez de `specialty` (string)
- `GET /doctors/:id` → retorna `specialties` em vez de `specialty`
- Sem token → `401`
- DOCTOR tenta criar → `403`

---

## Definition of Done

- [ ] DTOs compartilhados atualizados em `packages/shared` e exportados via `index.ts`
- [ ] `DoctorSpecialtyDto` criado e exportado
- [ ] `Doctor` entity atualizada: `specialty` removido, `specialties: Specialty[]` adicionado com `@ManyToMany`/`@JoinTable`
- [ ] `Specialty` entity atualizada com a relação inversa (opcional mas recomendado para consistência TypeORM)
- [ ] `ISpecialtiesRepository` com `findByIds` implementado e testado
- [ ] `DoctorsRepository` atualizado para carregar a relação `specialties` em todos os finders
- [ ] Todos os use-cases atualizados: `toResponse()` mapeia `doctor.specialties`
- [ ] `CreateDoctorUseCase` e `UpdateDoctorUseCase` validam `specialtyIds` via `ISpecialtiesRepository`
- [ ] `DoctorsModule` importa `SpecialtiesModule` (ou o repository via provider isolado)
- [ ] Migration criada e executada sem erros
- [ ] Migration migra dados existentes sem perda
- [ ] Testes unitários com 100% de cobertura para todos os use-cases modificados
- [ ] Testes unitários para `SpecialtiesRepository.findByIds`
- [ ] Testes de integração atualizados e cobrindo os novos cenários
- [ ] Sem erros de build / lint / `console.log`
- [ ] Naming convention e estrutura de pastas seguidas
