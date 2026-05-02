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
# Task — Tela de Login (Frontend)

## Descrição
Implementar a tela de login do sistema, permitindo que o usuário se autentique via email e senha. Após sucesso, o usuário é redirecionado para a área autenticada e os cookies de sessão são definidos pelo backend.

---

## Contexto

- Autenticação baseada em cookies `httpOnly` (`access_token` e `refresh_token`) — tokens nunca trafegam pelo JS.
- O `apiClient` já está configurado com `withCredentials: true` e interceptor de refresh em `401`.
- A rota `/login` deve ser pública e listada explicitamente no `middleware.ts`.
- Após login, redirecionar o usuário para a rota protegida padrão (ex.: `/dashboard`).
- Em caso de sucesso, atualizar o estado global de autenticação (usuário logado) via Zustand — somente metadados do usuário, nunca tokens.

---

## Contratos

### Input (dados do formulário)
ILoginInput:
- email: string
- password: string

### Output (modelo exibido na UI)
IAuthUserModel:
- id: string
- fullName: string
- email: string

---

## Assinaturas esperadas

```ts
// Hook
useLogin(): UseMutationResult<IAuthUserModel, IApiError, ILoginInput>

// Use-case
loginUseCase(input: ILoginInput): Promise<IAuthUserModel>

// Service
authService.login(data: ILoginInput): Promise<IAuthUserDto>
```

---

## Fluxo principal

1. Usuário acessa `/login`.
2. Preenche email e senha no formulário (`react-hook-form`).
3. Submete o formulário → `useLogin().mutate(input)`.
4. `loginUseCase` chama `authService.login` → backend define cookies `httpOnly`.
5. DTO mapeado para `IAuthUserModel` via `toAuthUserModel`.
6. Estado global de autenticação atualizado (`auth.store.ts`).
7. Redirecionamento para `/dashboard`.

---

## Estados e feedbacks

- Loading → botão desabilitado + spinner no botão (`isPending`).
- Erro `401` → mensagem amigável: "Email ou senha inválidos".
- Erro `422` → mapear erros para campos via `setError()` do `react-hook-form`.
- Erro genérico → mensagem amigável: "Não foi possível fazer login. Tente novamente."
- Sucesso → redirecionar para `/dashboard`.

---

## Regras de negócio

- Email obrigatório e formato válido.
- Senha obrigatória, mínimo 8 caracteres.
- Usuário já autenticado (com sessão válida) deve ser redirecionado direto para `/dashboard` ao acessar `/login`.
- Nenhum dado sensível (senha) deve aparecer em logs ou mensagens de erro.

---

## Dependências

- `authService` (`features/auth/services/auth.service.ts`)
- `authStore` (`stores/auth.store.ts`) — apenas para metadados do usuário autenticado
- `apiClient` (`lib/api-client.ts`)

---

## Decisões técnicas da task

- Usar React Query: **sim** — `useMutation` para login.
- Usar Zustand: **sim** — armazenar apenas dados do usuário autenticado (não tokens).
- Optimistic update: **não** — operação crítica, aguardar resposta do servidor.
- Formulário com react-hook-form: **sim** — com validação por schema (zod).

---

## Restrições

- NÃO armazenar tokens em `localStorage` ou `sessionStorage`.
- NÃO usar `useState` para campos do formulário — usar `react-hook-form`.
- NÃO exibir `detail` técnico ao usuário.
- NÃO importar `axios` diretamente — usar `apiClient`.
- NÃO armazenar dados de sessão da API em Zustand (apenas metadados do usuário).
- NÃO logar email, senha ou qualquer dado sensível.

---

## Estrutura esperada

```
features/auth/
  components/
    login-form.tsx
  hooks/
    use-login.hook.ts
  services/
    auth.service.ts
  use-cases/
    login.use-case.ts
  mappers/
    to-auth-user-model.ts
  types/
    auth.types.ts
app/
  (public)/login/page.tsx
stores/
  auth.store.ts
```

---

## Cenários de teste adicionais

- Submissão com email inválido → erro de validação no campo.
- Submissão com senha menor que 8 caracteres → erro de validação no campo.
- Backend retorna `401` → exibe mensagem "Email ou senha inválidos".
- Backend retorna `422` com erros de campo → erros mapeados nos respectivos inputs.
- Botão de submit desabilitado enquanto `isPending`.
- Sucesso → `authStore` atualizado e `router.push('/dashboard')` chamado.
- Usuário já autenticado acessa `/login` → redirecionado para `/dashboard`.
- E2E (Cypress): fluxo completo de login com `data-testid` em inputs e botão.

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Estados de loading, error e success tratados
- [ ] Validação de campos via `react-hook-form` + schema
- [ ] Mapeamento de erros `422` para campos
- [ ] `authStore` atualizado após sucesso (sem tokens)
- [ ] Redirecionamento pós-login funcionando
- [ ] Testes unitários (100%) — service, use-case, mapper, hook
- [ ] Testes de integração (loading / error / success) com React Testing Library
- [ ] Teste E2E (Cypress) do fluxo de login com `data-testid`
- [ ] Sem `console.log` ou dados sensíveis em logs
- [ ] Naming convention respeitado
- [ ] Nenhum import de `axios` fora de `lib/api-client.ts`