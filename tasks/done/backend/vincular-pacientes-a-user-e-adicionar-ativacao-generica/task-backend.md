# Task — Vincular Pacientes a User e Adicionar Ativação Genérica de Usuário (Backend)

## Descrição
Refatorar o módulo de pacientes para que cada `Patient` seja obrigatoriamente vinculado a um `User` (criado automaticamente como inativo no momento do cadastro do paciente), seguindo o mesmo padrão do módulo de doctors. Paralelamente, implementar um `ActivateUserUseCase` genérico no módulo de users que seta `isActive: true` e envia e-mail de configuração de senha, funcionando para qualquer role. Ajustar o `LoginUseCase` para bloquear usuários inativos.

---

## Contexto

- O módulo `patients` já está implementado como entidade standalone — esta task refatora esse modelo sem quebrar os testes existentes de integração.
- O padrão de vínculo `Patient → User` segue exatamente o que já existe em `Doctor → User`.
- O `User` criado automaticamente no cadastro de paciente recebe `role: PATIENT`, `isActive: false` e uma senha placeholder aleatória — ele não pode logar até ser ativado.
- A ativação é genérica: `ActivateUserUseCase` não conhece o `role` do usuário — o gatilho é sempre `isActive: false → true`.
- O `LoginUseCase` atualmente não verifica `isActive` — esse gap precisa ser fechado nesta task para que contas inativas sejam bloqueadas.
- `UpdatePatientDto` já possui `fullName?` e `email?` (em `@app/shared`) — na atualização, esses campos são propagados ao `User` vinculado via transação.
- `IUsersRepository` já é exportado pelo `UsersModule` — basta importar o módulo em `PatientsModule`.

---

## Contratos

### Mudanças em DTOs existentes (`packages/shared`)

**`PatientResponseDto` (breaking change):**
- Remover: `fullName: string`, `email: string`
- Adicionar: `user: PatientUserDto`

**`PatientUserDto` (novo, dentro de `patient-response.dto.ts`):**
- `id: string`
- `fullName: string`
- `email: string`
- `isActive: boolean`

**`CreatePatientDto` (sem alteração):**
- `fullName`, `email` permanecem — são usados para criar o `User`

**`UpdatePatientDto` (sem alteração):**
- `fullName?`, `email?` permanecem — são propagados ao `User` vinculado

**`UserRole` enum (breaking change):**
- Adicionar: `PATIENT = 'patient'`

### Novos DTOs

Nenhum DTO novo necessário — `ActivateUserUseCase` retorna `UserResponseDto` existente.

### Output de `ActivateUserUseCase`

Retorna `UserResponseDto` já existente:
- `id`, `fullName`, `email`, `role`, `isActive: true`, `createdAt`, `updatedAt`

---

## Assinaturas esperadas

**Use-cases:**

```
CreatePatientUseCase.execute(dto: CreatePatientDto): Promise<PatientResponseDto>
UpdatePatientUseCase.execute(id: string, dto: UpdatePatientDto): Promise<PatientResponseDto>
ActivateUserUseCase.execute(id: string): Promise<UserResponseDto>
```

**Repositories:**

```
IPatientsRepository:
- findAll(page, limit, search?): Promise<[Patient[], number]>
- findById(id): Promise<Patient | null>
- findByDocumentNumber(documentNumber): Promise<Patient | null>
- create(data: { userId, documentNumber, phoneNumber, birthDate, gender }, queryRunner?): Promise<Patient>
- update(id, data: UpdatePatientDto, queryRunner?): Promise<Patient>
- delete(id, queryRunner?): Promise<void>

IUsersRepository (método adicional necessário):
- activate(id: string, queryRunner?): Promise<User>
  — ou reutilizar update(id, { isActive: true }) — decidir na implementação
```

**Adapters:**

```
INotificationAdapter (novo, em modules/users/adapters/):
- sendAccountActivationEmail(to: string, fullName: string): Promise<void>
```

---

## Fluxo principal

### CreatePatient (refatorado)

1. Controller recebe `CreatePatientDto` validado.
2. Use-case verifica `documentNumber` único via `patientsRepository.findByDocumentNumber`.
3. Verifica email único via `usersRepository.findByEmail`.
4. Gera senha placeholder aleatória (`randomUUID()`) e faz hash com `bcrypt`.
5. Em transação (`runInTransaction`):
   a. Cria `User` com `{ fullName, email, password: hashedPlaceholder, role: PATIENT, isActive: false }`.
   b. Cria `Patient` com `{ userId: user.id, documentNumber, phoneNumber, birthDate, gender }`.
6. Invalida cache de listagem (`patients:list*`).
7. Retorna `PatientResponseDto` com `user: { id, fullName, email, isActive }` aninhado.

### UpdatePatient (refatorado)

1. Busca paciente com user carregado via `patientsRepository.findById`.
2. Se não existir → `NotFoundException`.
3. Se `dto.email` presente e diferente do atual → verifica unicidade via `usersRepository.findByEmail`.
4. Em transação (apenas se `fullName` ou `email` estiverem no dto):
   a. Atualiza `User` com os campos presentes.
   b. Atualiza `Patient` com `phoneNumber`, `birthDate`, `gender`.
5. Sem campos de User no dto → atualiza apenas `Patient` (sem transação).
6. Captura `OptimisticLockVersionMismatchError` → `ConflictException`.
7. Invalida cache (`patient:${id}` e `patients:list*`).
8. Retorna `PatientResponseDto` atualizado.

### ActivateUser (novo)

1. Controller recebe `PATCH /users/:id/activate`.
2. Use-case busca user via `usersRepository.findById`.
3. Se não existir → `NotFoundException`.
4. Se já estiver ativo (`isActive: true`) → `UnprocessableEntityException('User is already active')`.
5. Atualiza `isActive: true` via `usersRepository.update(id, { isActive: true })`.
6. Chama `notificationAdapter.sendAccountActivationEmail(user.email, user.fullName)` — em `try/catch` isolado, falha não quebra o fluxo.
7. Invalida cache (`user:${id}` e `users:list*`).
8. Retorna `UserResponseDto`.

### LoginUseCase (ajuste)

Após validar credenciais, adicionar verificação:
- Se `user.isActive === false` → `UnauthorizedException('Account is not active')`.

---

## Fluxos alternativos

- `documentNumber` já cadastrado → `ConflictException('Patient with this document number already exists')`
- Email já em uso (ao criar paciente) → `ConflictException('Email already in use')`
- Paciente não encontrado → `NotFoundException('Patient not found')`
- Email já em uso por outro user (ao atualizar) → `ConflictException('Email already in use')`
- Conflito de versão em update do Patient → `ConflictException('Record was modified by another process. Please try again.')`
- User não encontrado (ActivateUser) → `NotFoundException('User not found')`
- User já ativo (ActivateUser) → `UnprocessableEntityException('User is already active')`
- Falha no envio de e-mail (ActivateUser) → log `warn`, fluxo segue normalmente
- Falha na invalidação de cache → log `warn`, fluxo segue normalmente
- Login com conta inativa → `UnauthorizedException('Account is not active')`

---

## Regras de negócio

- Todo paciente deve ter exatamente um `User` vinculado com `role: PATIENT`.
- O `User` do paciente é criado automaticamente na criação do paciente — não exposto como endpoint separado.
- A senha do `User` criado junto ao paciente é um placeholder aleatório — o paciente define sua senha real via fluxo de ativação (e-mail).
- `documentNumber` é imutável — não presente no `UpdatePatientDto`.
- `birthDate` não pode ser futura.
- Ativação de usuário é sempre idempotente no sentido de nunca regredir: `isActive` só vai de `false` para `true`, nunca o contrário por esse endpoint.
- Login bloqueado para qualquer `User` com `isActive: false`, independente do role.

---

## Dependências

- `IPatientsRepository` (existente, assinatura de `create` muda)
- `IUsersRepository` (existente, importado de `UsersModule`)
- `INotificationAdapter` (novo, implementação stub em `NotificationAdapter`)
- `CacheService`
- `DataSource` (para transações em `CreatePatientUseCase` e `UpdatePatientUseCase`)

---

## Decisões técnicas da task

- **Usar transação:** Sim em `CreatePatient` (cria User + Patient atomicamente). Sim em `UpdatePatient` apenas quando `fullName` ou `email` estão presentes no dto (User + Patient atualizados juntos).
- **Usar distributed lock:** Não.
- **Usar cache:** Sim — mesmo padrão existente em `FindPatientById` e `ListPatients`. `ActivateUser` invalida `user:${id}` e `users:list*`.
- **Estratégia de concorrência:** Optimistic Lock via `@VersionColumn` no `Patient` (mantido). Sem lock no `User` durante criação de paciente — criação é atômica por transação.
- **Senha placeholder:** `bcrypt.hash(randomUUID(), 10)` — diretamente no use-case, sem `PasswordHasherService` (padrão já adotado no projeto).
- **Notificação:** `INotificationAdapter` com stub que loga — integração real com provedor de e-mail é escopo futuro. Adapter vive em `modules/users/adapters/`.

---

## Restrições

- NÃO expor endpoint de criação de `User` com `role: PATIENT` — o vínculo é criado internamente.
- NÃO permitir alteração de `documentNumber` via qualquer endpoint.
- NÃO logar `documentNumber`, `email` ou `phoneNumber` em logs de erro.
- NÃO usar hard delete.
- NÃO deixar `LoginUseCase` sem verificação de `isActive`.
- NÃO quebrar os testes de integração existentes do módulo de patients sem atualizá-los.
- NÃO acessar `process.env` fora de `env.config.ts`.

---

## Estrutura esperada

```
packages/shared/src/
  enums/
    user-role.enum.ts              ← adicionar PATIENT
  dtos/
    patient-response.dto.ts        ← adicionar PatientUserDto, atualizar PatientResponseDto

modules/patients/
  entities/
    patient.entity.ts              ← adicionar userId + @ManyToOne(User), remover fullName/email
  use-cases/
    create-patient.use-case.ts     ← refatorar (transação + criação de User)
    update-patient.use-case.ts     ← refatorar (propagar fullName/email ao User)
  repositories/
    patients.repository.interface.ts  ← atualizar assinatura de create()
    patients.repository.ts            ← atualizar implementação de create()
  patients.module.ts               ← importar UsersModule
  tests/
    create-patient.use-case.spec.ts   ← atualizar
    update-patient.use-case.spec.ts   ← atualizar
    patients.integration.spec.ts      ← atualizar

modules/users/
  adapters/
    notification.adapter.interface.ts  ← novo
    notification.adapter.ts            ← novo (stub)
  use-cases/
    activate-user.use-case.ts          ← novo
  controllers/
    users.controller.ts                ← adicionar PATCH /:id/activate
  users.module.ts                      ← registrar ActivateUserUseCase + INotificationAdapter
  tests/
    activate-user.use-case.spec.ts     ← novo
    users.integration.spec.ts          ← adicionar cenários de ativação

modules/auth/
  use-cases/
    login.use-case.ts              ← adicionar verificação de isActive
  tests/
    login.use-case.spec.ts         ← adicionar cenário de conta inativa

database/migrations/
  <timestamp>_link_patients_to_users.ts  ← novo
```

---

## Migration

A migration deve:
1. Adicionar coluna `user_id UUID NOT NULL` na tabela `patients` (após criar os Users correspondentes para registros existentes, se houver).
2. Adicionar FK `patients.user_id → users.id`.
3. Remover colunas `full_name` e `email` da tabela `patients`.

> Se o banco de dados de desenvolvimento tiver pacientes existentes, a migration deve criar Users para eles antes de remover as colunas (data migration inline). Em ambiente limpo, basta o DDL.

---

## Cenários de teste adicionais

**CreatePatient:**
- Criar paciente com email já em uso por outro User → `409 Conflict`
- Criar paciente com `documentNumber` já existente → `409 Conflict`
- Criar paciente com sucesso → User criado com `role: PATIENT` e `isActive: false`
- Criar paciente com sucesso → Patient vinculado ao User criado via `userId`
- Falha na criação do Patient após criação do User → rollback cria nem User nem Patient
- Response inclui `user.isActive: false` no objeto de retorno

**UpdatePatient:**
- Atualizar apenas campos do Patient (`phoneNumber`, `gender`) → User não é modificado
- Atualizar `fullName` → User atualizado na mesma transação
- Atualizar `email` para email já em uso → `409 Conflict`
- Conflito de versão no Patient → `409 Conflict`

**ActivateUser:**
- Ativar user inexistente → `404 Not Found`
- Ativar user já ativo → `422 Unprocessable Entity`
- Ativar user com sucesso → `isActive: true` na resposta
- Falha no envio de e-mail → ativação persiste, log `warn`, retorna `200`
- Após ativação, user consegue fazer login

**LoginUseCase:**
- Login com conta inativa → `401 Unauthorized`
- Login com conta ativa → sucesso (comportamento existente mantido)

---

## Definition of Done

- [ ] `UserRole.PATIENT` adicionado ao enum em `@app/shared`
- [ ] `PatientResponseDto` atualizado com `user: PatientUserDto` aninhado
- [ ] `Patient` entity com `userId` FK e sem `fullName`/`email`
- [ ] `CreatePatientUseCase` cria User + Patient em transação
- [ ] `UpdatePatientUseCase` propaga `fullName`/`email` ao User em transação quando presentes
- [ ] `ActivateUserUseCase` implementado com envio de e-mail via adapter
- [ ] `INotificationAdapter` definido como abstract class com implementação stub
- [ ] Endpoint `PATCH /users/:id/activate` criado
- [ ] `LoginUseCase` verifica `isActive` antes de autenticar
- [ ] Migration criada para alterar tabela `patients`
- [ ] Testes unitários atualizados/criados com 100% de cobertura
- [ ] Testes de integração atualizados/criados para todos os cenários
- [ ] Nenhum dado sensível em logs
- [ ] Naming convention respeitada
