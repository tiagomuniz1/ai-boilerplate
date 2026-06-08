# Task — Adaptar Autenticação para Multi-tenancy (Frontend)

## Descrição
Atualizar o contexto de autenticação do frontend para armazenar e expor o `clinicId` retornado pelo `GET /auth/me`. A partir desta task, o `clinicId` fica disponível em toda a aplicação via store de auth, sem nenhuma query adicional por componente.

**Pré-requisito:** task backend **integrar-clinicid-na-autenticacao** concluída (`GET /auth/me` retorna `clinicId`).

---

## Contexto
- O `clinicId` não precisa ser enviado nas requisições da API — o backend o extrai do JWT automaticamente. O frontend só precisa armazená-lo para uso em lógica de UI (ex: exibir nome da clínica, filtrar opções por clínica no futuro).
- O `clinicId` vem do endpoint `GET /auth/me`, que já é chamado na inicialização da sessão.
- O frontend **não deve ler o JWT para extrair o `clinicId`** — usar sempre a resposta do `/auth/me`.
- A Zustand store de auth (`auth.store.ts`) é o único lugar onde o `clinicId` é armazenado globalmente.

---

## Contratos

### IMeModel (atualizado)

```ts
export interface IMeModel {
  id: string
  fullName: string
  email: string
  role: UserRole
  clinicId: string  // NOVO
  isActive: boolean
}
```

### AuthStore (atualizada)

```ts
interface AuthState {
  user: IMeModel | null
  setUser: (user: IMeModel | null) => void
  clinicId: string | null  // getter derivado de user.clinicId — ou expor diretamente via seletor
}
```

---

## Mudanças por arquivo

### `packages/shared/src/dtos/me-response.dto.ts`
Adicionar campo `clinicId: string`.

### `components/features/auth/mappers/to-me-model.ts`
Mapear `clinicId: dto.clinicId`.

### `stores/auth.store.ts`
Sem mudança estrutural — o campo `user` já armazena o modelo inteiro. Como `IMeModel` agora inclui `clinicId`, ele estará disponível automaticamente via `useAuthStore(state => state.user?.clinicId)`.

### `components/features/auth/types/auth.types.ts`
Atualizar `IMeModel` com `clinicId: string`.

---

## Assinaturas esperadas

```ts
// mapper
function toMeModel(dto: MeResponseDto): IMeModel

// seletor de uso comum nos componentes
const clinicId = useAuthStore(state => state.user?.clinicId)
```

---

## Fluxos

### Inicialização da sessão
1. `GET /auth/me` retorna `{ id, fullName, email, role, clinicId, isActive }`.
2. `toMeModel()` mapeia o DTO para `IMeModel` incluindo `clinicId`.
3. `authStore.setUser(model)` armazena na store.
4. `clinicId` fica disponível para qualquer componente via seletor.

---

## Restrições

- NÃO decodificar o JWT no frontend para extrair `clinicId` — usar apenas a resposta do `/auth/me`.
- NÃO armazenar `clinicId` em `localStorage` separadamente — a store de auth já gerencia o estado de sessão.
- NÃO enviar `clinicId` nas requisições de API — o backend extrai do token automaticamente.
- NÃO criar uma query React Query para o `clinicId` — já vem do estado de auth.

---

## Cenários de teste adicionais

- `toMeModel()` mapeia `clinicId` corretamente do DTO
- Store de auth expõe `clinicId` após `setUser()`
- `clinicId` é `null` quando usuário não está autenticado
- Após logout, `clinicId` retorna `null`

---

## Definition of Done

- [ ] `IMeModel` atualizado com `clinicId`
- [ ] `MeResponseDto` em `packages/shared` atualizado com `clinicId`
- [ ] `toMeModel()` mapeia `clinicId`
- [ ] `clinicId` acessível via `useAuthStore`
- [ ] Testes unitários do mapper atualizados
- [ ] Testes de integração do hook de auth atualizados
- [ ] Cobertura 100% mantida nos arquivos alterados
