# Task — Fluxo de Onboarding de Clínica (Backend)

## Descrição
Implementar o endpoint público de registro de uma nova clínica. Em uma única requisição, cria a clínica e o primeiro usuário administrador em transação atômica, retornando os dados para que o frontend redirecione para o login.

**Pré-requisito:** tasks **criar-modulo-de-clinicas**, **adicionar-clinic-id-ao-schema** e **integrar-clinicid-na-autenticacao** concluídas.

---

## Contexto
- Este é o único endpoint público de escrita além do login — permite que uma nova clínica se registre na plataforma sem intervenção manual.
- A criação é atômica: clínica + admin user em uma única transação. Se o usuário já existe (email duplicado) ou o slug já existe, a operação inteira reverte.
- O admin criado recebe `role: UserRole.ADMIN` e `isActive: true` — já pode logar imediatamente.
- O endpoint fica sob `POST /clinics/register` com `@Public()` (sem autenticação).
- Rate limiting agressivo neste endpoint: `5 req / 60s` por IP.

---

## Contratos

### Input

**RegisterClinicDto:**
- clinicName: string (obrigatório, min 3, max 120)
- slug?: string (opcional, formato kebab-case)
- adminFullName: string (obrigatório, min 3, max 120)
- adminEmail: string (obrigatório, formato email)
- adminPassword: string (obrigatório, min 8, max 64)

### Output

**RegisterClinicResponseDto:**
- clinic: { id: string, name: string, slug: string }
- admin: { id: string, fullName: string, email: string }

---

## Assinatura esperada

**Use-case:**
- `RegisterClinicUseCase.execute(dto: RegisterClinicDto): Promise<RegisterClinicResponseDto>`

---

## Fluxo principal

**POST /clinics/register**
1. Controller recebe `RegisterClinicDto` validado. Endpoint marcado com `@Public()` e `@Throttle({ default: { limit: 5, ttl: 60000 } })`.
2. Use-case gera o slug da clínica (mesmo algoritmo do `CreateClinicUseCase`).
3. Verifica unicidade do slug — `ConflictException('Slug already in use')` se existir.
4. Verifica unicidade do email do admin — `ConflictException('Email already in use')` se existir.
5. Executa em transação:
   a. Cria a clínica.
   b. Cria o usuário admin com `role: ADMIN`, `isActive: true`, `clinicId: clinic.id` e senha hasheada com bcrypt.
6. Invalida caches `clinics:list*` e `users:list*` após commit.
7. Retorna `RegisterClinicResponseDto` com status `201`.

---

## Fluxos alternativos

- Slug já em uso → `ConflictException('Slug already in use')` — transação não iniciada
- Email já em uso → `ConflictException('Email already in use')` — transação não iniciada
- Violação de constraint de slug no banco (race condition) → capturar `QueryFailedError` com código `23505` e constraint `clinics_slug_unique` → lançar `ConflictException('Slug already in use')`
- Violação de constraint de email no banco (race condition) → capturar `QueryFailedError` com código `23505` e constraint `UQ_users_email_active` → lançar `ConflictException('Email already in use')`
- Qualquer erro dentro da transação → rollback automático via `runInTransaction`

---

## Regras de negócio

- Slug gerado a partir de `clinicName` se não fornecido (mesma lógica do `CreateClinicUseCase`).
- Senha do admin hasheada com bcrypt (cost 10) — nunca retornada na resposta.
- O admin é o único usuário criado no onboarding — ele pode convidar outros usuários depois.
- Clínica criada com `isActive: true` por padrão.

---

## Dependências

- `IClinicsRepository`
- `IUsersRepository`
- `CacheService`
- `bcrypt`

---

## Decisões técnicas da task

- **Transação:** Sim — clínica e admin user em uma única transação atômica.
- **Rate limiting:** `@Throttle({ default: { limit: 5, ttl: 60000 } })` no endpoint.
- **Autenticação:** Endpoint público (`@Public()`).
- **Resposta:** `201 Created` com dados mínimos — não retornar tokens (usuário deve logar explicitamente).

---

## Estrutura esperada

```
modules/clinics/
  use-cases/
    register-clinic.use-case.ts   (NOVO)
  clinics.module.ts               (atualizado — adicionar RegisterClinicUseCase)
  controllers/
    clinics.controller.ts         (atualizado — adicionar rota POST /register)

packages/shared/src/dtos/
  register-clinic.dto.ts          (NOVO)
  register-clinic-response.dto.ts (NOVO)
```

---

## Cenários de teste adicionais

- Registro com dados válidos → `201` com clínica e admin criados
- Registro com slug já existente → `409 Conflict`
- Registro com email já cadastrado → `409 Conflict`
- Registro com senha curta → `400 Bad Request`
- Registro com slug em formato inválido → `400 Bad Request`
- Admin criado com `role: ADMIN` e `isActive: true`
- Admin consegue fazer login imediatamente após o registro
- Race condition de slug → `409` (constraint do banco capturado corretamente)
- Race condition de email → `409` (constraint do banco capturado corretamente)
- Endpoint acessível sem token de autenticação
- Rate limit: 6ª requisição no mesmo minuto → `429 Too Many Requests`

---

## Definition of Done

- [ ] Endpoint `POST /clinics/register` público implementado
- [ ] Criação de clínica + admin em transação atômica
- [ ] Geração de slug automática quando não fornecido
- [ ] Verificações de unicidade (slug e email) antes e durante a transação
- [ ] Rate limiting configurado (`5 req/60s`)
- [ ] DTOs em `packages/shared`
- [ ] Testes unitários com 100% de cobertura para `RegisterClinicUseCase`
- [ ] Testes de integração cobrindo cenários de sucesso e conflito
- [ ] Resposta não contém senha nem token
- [ ] Admin criado consegue logar imediatamente
