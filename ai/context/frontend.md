# Frontend

## Stack

* Next.js (App Router) / React / React Query (TanStack) / Tailwind CSS / Zustand

---

## Arquitetura

```
UI (Components)
→ Hooks (React Query / estado)
→ Use Cases (Application Layer)
→ Services (API Layer)
→ API Client
```

---

## Estrutura de Diretórios

```
apps/frontend/
  app/layout.tsx / providers.tsx
  components/
    ui/atoms/ / molecules/ / organisms/
    features/
      auth/components/ / hooks/ / services/ / use-cases/
      users/components/ / hooks/ / services/ / use-cases/ / mappers/ / types/
  hooks/
  lib/api-client.ts / react-query.config.ts / constants.ts
  stores/
  types/api.types.ts
  utils/
  cypress/e2e/ / fixtures/ / support/
```

---

## API Client

O API Client é a **única fronteira com o axios**.

```ts
// lib/api-client.ts
const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
})

client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true
      try {
        await authService.refresh()
        return client(error.config)
      } catch {
        window.location.href = '/login'
      }
    }
    return Promise.reject(normalizeProblemDetails(error))
  }
)

export const apiClient = {
  get: <T>(url: string): Promise<T> => client.get(url),
  post: <T>(url: string, data?: unknown): Promise<T> => client.post(url, data),
  put: <T>(url: string, data?: unknown): Promise<T> => client.put(url, data),
  patch: <T>(url: string, data?: unknown): Promise<T> => client.patch(url, data),
  delete: <T>(url: string): Promise<T> => client.delete(url),
}
```

* **Nunca importar `axios` ou seus tipos fora de `lib/api-client.ts`**
* `withCredentials: true` obrigatório
* Todo erro normalizado para `IApiError` antes de propagar

---

## Services

```ts
export const userService = {
  getAll: () => apiClient.get<IUserDto[]>('/users'),
  getById: (id: string) => apiClient.get<IUserDto>(`/users/${id}`),
  create: (data: ICreateUserInput) => apiClient.post<IUserDto>('/users', data),
  update: (id: string, data: IUpdateUserInput) => apiClient.put<IUserDto>(`/users/${id}`, data),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
```

* NÃO usar classes
* NÃO importar `axios` — usar apenas `apiClient`
* Services retornam DTOs — mappers fazem a transformação

---

## Mappers

```ts
export function toUserModel(dto: IUserDto): IUserModel {
  return {
    id: dto.id,
    fullName: dto.full_name,
    email: dto.email,
    createdAt: new Date(dto.created_at),
  }
}
```

* Funções puras — sem side effects
* Sempre converter tipos — `string → Date`, `snake_case → camelCase`
* Nunca mapear dentro de componentes ou hooks

---

## Use Cases

```ts
export async function createUserUseCase(data: ICreateUserInput) {
  const dto = await userService.create(data)
  return toUserModel(dto)
}
```

* Use-cases são **funções** no frontend (ao contrário do backend, que são classes)

---

## Hooks

```ts
export function useCreateUser() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: createUserUseCase,
    onSuccess: () => {
      queryClient.invalidateQueries(['users'])
      router.push('/users')
    },
  })
}
```

---

## React Query

```ts
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60, retry: 1, refetchOnWindowFocus: false },
      mutations: { retry: 0 },
    },
  })
}
```

* `Providers` em `app/providers.tsx` — nunca no `layout.tsx` diretamente
* `retry: 0` em mutations — nunca repetir automaticamente

---

## Estado Global

| Tipo de estado | Solução |
|---|---|
| Estado de servidor (dados da API) | React Query — sempre |
| Estado local de componente | `useState` / `useReducer` |
| Estado global (UI, auth, preferências) | Zustand |

* **Nunca usar Zustand para dados que vêm da API**
* Stores em `stores/` — um arquivo por domínio (`auth.store.ts`)
* Nunca usar Zustand dentro de services, use-cases ou mappers

---

## Formulários

* Sempre `react-hook-form` — nunca `useState` para campos
* Erros `422` do backend mapeados para campos via `setError()`
* Botão desabilitado enquanto `isPending`
* Tipos do formulário como interface local — não reutilizar DTOs do backend

---

## Tratamento de Erros e Loading

* Sempre tratar os três estados: `loading`, `error`, `success`
* Loading → skeleton correspondente
* Erro → `ErrorMessage` com mensagem amigável — nunca exibir `detail` técnico ao usuário

---

## Autenticação

| Cookie | Flags |
|---|---|
| `access_token` | `httpOnly`, `Secure`, `SameSite=Strict` |
| `refresh_token` | `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/auth/refresh` |

* Nunca armazenar tokens em `localStorage` ou `sessionStorage`
* Rotas públicas explicitamente listadas no `middleware.ts`

---

## Variáveis de Ambiente

* Variáveis injetadas pelo GitHub Actions no build
* Nunca colocar secrets em `NEXT_PUBLIC_*`

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base da API do backend |

---

## Segurança

* Nunca armazenar tokens em `localStorage`
* Nunca exibir detalhes técnicos de erro ao usuário
* Nunca colocar secrets em `NEXT_PUBLIC_*`

---

## Naming Convention

| Elemento | Convenção | Exemplo |
|---|---|---|
| Componentes | PascalCase | `UserList`, `UserCard` |
| Hooks | `use` + PascalCase | `useUsers`, `useCreateUser` |
| Use-cases | camelCase (função) | `createUserUseCase` |
| Services | kebab-case + sufixo | `users.service.ts` |
| Mappers | camelCase | `toUserModel` |
| Interfaces | PascalCase + `I` | `IUserModel` |
| Arquivos de hook | kebab-case + `.hook.ts` | `use-create-user.hook.ts` |
| Stores | kebab-case + `.store.ts` | `auth.store.ts` |

* Componentes como substantivos — `UserList`, não `ListUsers`
* Hooks com verbo — `useCreateUser`, não `useUserCreation`
* Mappers com `to` + modelo destino — `toUserModel`
* Use-cases são funções no frontend, classes no backend

---

## Testes

**Unitários:**
* 100% de cobertura obrigatória
* Todas as dependências mockadas

**Integração:**
* React Testing Library + Jest
* Services mockados via `jest.mock()`
* `renderWithProviders()` usa `createQueryClient()` — mesma factory da aplicação
* Testar sempre loading, error e success
* Buscar por texto, role, label — nunca por classe ou id interno

**E2E (Cypress):**
* Sempre `data-testid` — nunca classes CSS ou texto
* Cada teste independente — sem depender do estado de outro
* Cobrir fluxos críticos: login, navegação principal, CRUD completo

---

## Definition of Done

* [ ] Implementação completa conforme requisitos
* [ ] Sem erros de build / warnings de lint / `console.log` ou código comentado
* [ ] Testes unitários com 100% de cobertura
* [ ] Testes de integração (loading, error, success)
* [ ] Segue arquitetura e naming convention
* [ ] Sem mistura de camadas
* [ ] Nenhum tipo do axios fora de `lib/api-client.ts`
* [ ] Dados da API gerenciados via React Query — nunca via Zustand
* [ ] Nenhum dado sensível em logs
* [ ] Nenhum secret em `NEXT_PUBLIC_*`

---

## Code Review — Bloqueantes

* Violação de arquitetura (camadas misturadas, axios fora do API Client)
* Falta de testes ou cobertura incompleta
* Dados sensíveis em logs ou código
* Bug óbvio ou comportamento incorreto
* Violação de naming convention
* Dados da API armazenados em Zustand em vez de React Query
