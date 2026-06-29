# Task — Tela de Definição de Senha (Frontend)

## Descrição

Adicionar a rota pública `/{slug}/set-password` que o médico acessa pelo link recebido por e-mail após ser cadastrado. A página valida o token, exibe o formulário de nova senha e, após sucesso, redireciona para o login com mensagem de confirmação.

---

## Contexto

- O link enviado no e-mail tem formato: `https://{domínio}/{slug}/set-password?token={plaintextToken}`.
- Dois endpoints estão disponíveis (implementados na task de backend):
  - `GET /auth/set-password/validate?token=` → `{ valid: boolean, email: string | null }`
  - `POST /auth/set-password` → body `{ token, password }` → `204`
- A rota é pública — sem autenticação, sem guard. Deve ser listada em `middleware.ts` como rota pública (mesma lógica do `/login`).
- Estrutura de rota: `app/[slug]/(public)/set-password/page.tsx` — espelha `app/[slug]/(public)/login/page.tsx`.

---

## Contratos

### DTOs (packages/shared — já criados no backend)

```ts
ValidateSetPasswordTokenResponseDto { valid: boolean; email: string | null }
SetPasswordDto { token: string; password: string }
```

### Service

```ts
// set-password.service.ts
export const setPasswordService = {
  validate: (token: string): Promise<ValidateSetPasswordTokenResponseDto> =>
    apiClient.get(`/auth/set-password/validate?token=${encodeURIComponent(token)}`),
  setPassword: (data: SetPasswordDto): Promise<void> =>
    apiClient.post('/auth/set-password', data),
}
```

### Mapper

Não necessário — a resposta de `validate` é mapeada diretamente (sem campos de data/transformação).

### Use-cases (funções)

```ts
validateSetPasswordTokenUseCase(token: string): Promise<{ valid: boolean; email: string | null }>
setPasswordUseCase(data: { token: string; password: string }): Promise<void>
```

### Hooks

```ts
useValidateSetPasswordToken(token: string | null)
// useQuery com queryKey ['set-password-validate', token]; habilitado apenas se token não-nulo.
// staleTime: Infinity (resultado não muda enquanto a página está aberta)

useSetPassword()
// useMutation; onSuccess → router.push(`/${slug}/login?passwordSet=true`)
```

---

## Fluxo da página

```
Carrega /{slug}/set-password?token=XYZ
  └─> lê searchParams.get('token')
       ├─> token ausente → exibe "Link inválido"
       └─> chama GET /auth/set-password/validate?token=XYZ
            ├─> loading → skeleton / spinner
            ├─> { valid: false } → exibe "Link expirado ou já utilizado"
            └─> { valid: true, email } → exibe formulário (email readonly + senha + confirmar senha)
                 └─> submit → POST /auth/set-password { token, password }
                      ├─> 204 → redirect /{slug}/login?passwordSet=true
                      ├─> 422 "Token already used" → "Link já foi utilizado"
                      ├─> 422 "Token expired" → "Link expirado"
                      └─> outros → mensagem genérica de erro
```

### Página de login — mensagem de feedback

Quando `?passwordSet=true` está presente na URL do login, exibir um alerta de sucesso:
> "Senha definida com sucesso. Faça login para continuar."

O alerta desaparece ao submeter o formulário (não é persistido).

---

## Formulário (react-hook-form + zod)

```ts
const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})
```

- Campo `email` exibido como `<input readOnly>` (identifica o destinatário, não faz parte do submit).
- Botão desabilitado enquanto `isPending`.
- Erro 422 mapeado para mensagem amigável inline (não via `setError` — é erro do token, não do campo).

---

## Estados da página

| Estado | UI |
|---|---|
| Token ausente na URL | Alert de erro: "Link inválido. Verifique o e-mail recebido." |
| Validando token | Spinner centrado com `data-testid="set-password-validating"` |
| `valid: false` | Alert de erro: "Este link já foi utilizado ou expirou. Solicite ao administrador um novo convite." |
| `valid: true` | Formulário com email readonly + campos de senha |
| Submetendo | Botão com `isLoading` + `disabled` |
| Sucesso | Redirect para `/{slug}/login?passwordSet=true` |
| Erro no submit | Alert de erro inline com `data-testid="set-password-error"` |

---

## data-testid obrigatórios

| Elemento | testid |
|---|---|
| Container principal | `set-password-page` |
| Spinner de validação | `set-password-validating` |
| Alert de token inválido/expirado | `set-password-invalid-token` |
| Alert de link ausente | `set-password-missing-token` |
| Campo email readonly | `set-password-email` |
| Campo senha | `set-password-password` |
| Campo confirmar senha | `set-password-confirm-password` |
| Botão submit | `set-password-submit` |
| Alert de erro no submit | `set-password-error` |
| Alert de sucesso na tela de login | `login-password-set-success` |

---

## Autenticação / Middleware

Adicionar `/[slug]/set-password` à lista de rotas públicas no `middleware.ts` (mesmo padrão do `/login`):

```ts
const PUBLIC_PATHS = ['/login', '/set-password', '/register']
// verificar como está implementado atualmente e espelhar
```

---

## Estrutura esperada

```
components/features/set-password/
  services/
    set-password.service.ts
    set-password.service.spec.ts
  use-cases/
    validate-set-password-token.use-case.ts
    validate-set-password-token.use-case.spec.ts
    set-password.use-case.ts
    set-password.use-case.spec.ts
  hooks/
    use-validate-set-password-token.hook.ts
    use-validate-set-password-token.hook.spec.ts
    use-set-password.hook.ts
    use-set-password.hook.spec.ts
  components/
    set-password-form.tsx
    set-password-form.integration.spec.tsx

app/[slug]/(public)/set-password/
  page.tsx                          ← nova rota pública

app/[slug]/(public)/login/
  page.tsx                          ← modificado: lê ?passwordSet=true e exibe alerta
```

---

## Cenários de teste

### set-password.service.spec.ts
- `validate` chama `GET /auth/set-password/validate?token=…` com o token codificado.
- `setPassword` chama `POST /auth/set-password` com body `{ token, password }`.

### validate-set-password-token.use-case.spec.ts
- Chama o service e retorna o resultado diretamente.

### set-password.use-case.spec.ts
- Chama `setPasswordService.setPassword` com os dados corretos.

### use-validate-set-password-token.hook.spec.ts
- Query desabilitada quando `token` é `null`.
- Query habilitada e retorna dados quando `token` é string.

### use-set-password.hook.spec.ts
- `onSuccess` redireciona para `/{slug}/login?passwordSet=true`.

### set-password-form.integration.spec.tsx
- Exibe spinner enquanto valida o token.
- Exibe alert de token inválido quando `valid: false`.
- Exibe alert de token ausente quando URL não tem `?token=`.
- Exibe formulário com email readonly quando `valid: true`.
- Erro de validação do zod em `confirmPassword` quando senhas diferentes.
- Submit com senhas válidas chama `setPasswordService.setPassword`.
- Submit com token já usado exibe mensagem "já foi utilizado".
- Submit com token expirado exibe mensagem "expirado".
- Submit com erro genérico exibe mensagem genérica.
- Após sucesso, redireciona para login com `?passwordSet=true`.
- Tela de login com `?passwordSet=true` exibe alert de sucesso com `data-testid="login-password-set-success"`.

---

## Definition of Done

- [ ] Rota `/{slug}/set-password` criada como página pública.
- [ ] `set-password.service.ts` implementado sem axios direto.
- [ ] Use-cases, hooks e componente com 100% de cobertura unitária.
- [ ] Testes de integração cobrindo todos os estados da página.
- [ ] Middleware atualizado para tratar a rota como pública.
- [ ] Mensagem de feedback no login quando `?passwordSet=true`.
- [ ] `data-testid` em todos os elementos interativos e de estado.
- [ ] Nenhum dado sensível (token, senha) em logs ou estado global.
- [ ] Nenhum axios fora de `lib/api-client.ts`.
- [ ] Dados de API via React Query — nunca Zustand.
