# Task — Integrar clinicId na Autenticação (Backend)

## Descrição
Estender o fluxo de autenticação JWT para incluir o `clinicId` no payload do token. A partir desta task, toda requisição autenticada carrega a identidade da clínica do usuário, tornando-a disponível nos use-cases via `ICurrentUser`.

**Pré-requisito:** task **adicionar-clinic-id-ao-schema** concluída (coluna `clinic_id` em `users`).

---

## Contexto
- Cada usuário pertence a exatamente uma clínica (`users.clinic_id`). O `clinicId` é resolvido no login a partir do registro do usuário — não é fornecido pelo cliente.
- O `clinicId` deve constar no **access token** e no **refresh token** para que, ao renovar o token, o contexto da clínica seja preservado sem consultar o banco.
- `ICurrentUser` é o contrato usado por todos os use-cases para identificar quem está fazendo a requisição. Adicionar `clinicId` aqui propaga o contexto para toda a cadeia sem nenhuma query adicional por request.
- O fluxo de login **não muda para o usuário final** — ele continua enviando apenas `email` e `password`.

---

## Contratos

### JwtPayload (interno)

```ts
interface JwtPayload {
  sub: string       // userId
  clinicId: string  // clínica do usuário
  iat?: number
  exp?: number
}
```

### ICurrentUser (atualizado)

```ts
interface ICurrentUser {
  id: string
  role: UserRole
  clinicId: string  // NOVO
}
```

---

## Mudanças por arquivo

### `modules/auth/types/current-user.type.ts`
Adicionar campo `clinicId: string`.

### `modules/auth/use-cases/login.use-case.ts`
Ao gerar o access token e refresh token, incluir `clinicId: user.clinicId` no payload.

```ts
const payload: JwtPayload = {
  sub: user.id,
  clinicId: user.clinicId,  // NOVO
}
```

### `modules/auth/use-cases/refresh-token.use-case.ts`
Ao validar o refresh token e gerar novos tokens, propagar `clinicId` do payload original.

```ts
const payload: JwtPayload = {
  sub: decoded.sub,
  clinicId: decoded.clinicId,  // NOVO
}
```

### `modules/auth/strategies/jwt.strategy.ts`
No método `validate()`, incluir `clinicId` no objeto retornado:

```ts
async validate(payload: JwtPayload): Promise<ICurrentUser> {
  return {
    id: payload.sub,
    role: user.role,
    clinicId: payload.clinicId,  // NOVO
  }
}
```

A busca do `role` já é feita no banco — o `clinicId` vem direto do payload (sem query adicional).

### `modules/auth/use-cases/me.use-case.ts`
Incluir `clinicId` na resposta do `GET /auth/me` para que o frontend possa armazenar o `clinicId` no estado de autenticação.

---

## MeResponseDto (atualizado)

Adicionar em `packages/shared/src/dtos/me-response.dto.ts` (ou equivalente):

```ts
export class MeResponseDto {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string  // NOVO
  isActive: boolean
}
```

---

## Fluxos alternativos

- Usuário sem `clinic_id` no banco (dados legados sem migração correta) → `login.use-case.ts` lança `UnauthorizedException('User is not associated with a clinic')` — nunca deve ocorrer após a migration, mas é uma salvaguarda.
- Token com `clinicId` ausente (tokens gerados antes desta mudança) → `JwtStrategy.validate()` lança `UnauthorizedException` — forçar novo login.

---

## Impacto nos testes

### Testes unitários — arquivos a atualizar
- `login.use-case.spec.ts` — verificar que `clinicId` está no payload gerado
- `refresh-token.use-case.spec.ts` — verificar que `clinicId` é propagado no novo token
- `me.use-case.spec.ts` — verificar que `clinicId` está na resposta
- `jwt.strategy.spec.ts` — verificar que `validate()` retorna `clinicId`
- Todos os specs que constroem `ICurrentUser` manualmente (controllers, use-cases de outros módulos) precisam adicionar `clinicId: faker.string.uuid()` nos mocks

### Testes de integração — arquivos a atualizar
- `auth.integration.spec.ts` — verificar que a resposta do `/auth/me` inclui `clinicId`
- Todos os outros specs de integração onde `loginAs()` é usado — o token já vai carregar `clinicId` automaticamente após a atualização do `login.use-case.ts`

---

## Restrições

- NÃO adicionar endpoint para trocar de clínica — cada usuário pertence a uma única clínica.
- NÃO buscar `clinicId` do banco em cada request — deve vir sempre do JWT payload.
- NÃO alterar os use-cases de negócio (doctors, patients, etc.) nesta task — isso é responsabilidade da task **isolar-dados-por-clinica**.
- NÃO expor o `clinicId` no corpo do access token de forma que o cliente possa alterá-lo — o JWT é assinado e verificado pelo backend.

---

## Definition of Done

- [ ] `ICurrentUser` atualizado com `clinicId`
- [ ] `JwtPayload` atualizado com `clinicId`
- [ ] `LoginUseCase` inclui `clinicId` no payload do access token e refresh token
- [ ] `RefreshTokenUseCase` propaga `clinicId` do token original
- [ ] `JwtStrategy.validate()` retorna `clinicId` extraído do payload
- [ ] `MeResponseDto` inclui `clinicId`
- [ ] Salvaguarda no login para usuário sem `clinic_id` no banco
- [ ] Testes unitários atualizados — 100% de cobertura mantida
- [ ] Testes de integração atualizados e passando
- [ ] Nenhuma query adicional ao banco por request autenticado para resolver `clinicId`
