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
# Task — Sidebar de Navegação (Frontend)

## Descrição
Implementar um componente de Sidebar persistente com os menus principais para navegação entre as áreas autenticadas da aplicação. A sidebar deve destacar o item ativo conforme a rota atual e ser responsiva (colapsável em telas menores).

---

## Contexto
- A sidebar é parte do layout autenticado da aplicação e deve ser renderizada em todas as páginas internas (não em rotas públicas como `/login`).
- O item de menu ativo é determinado pela rota atual via `usePathname()` do Next.js App Router.
- O estado de colapso da sidebar (aberta/fechada) é uma preferência de UI e deve persistir entre navegações enquanto a sessão estiver ativa.
- A lista de menus é estática por enquanto — futuramente poderá ser filtrada por permissão/role do usuário.

---

## Contratos

### Input (configuração de cada item de menu)
INavigationItem:
- id: string
- label: string
- href: string
- icon: ReactNode
- requiredRoles?: UserRole[] (opcional, futuro)

### Output (modelo exibido na UI)
INavigationItemViewModel:
- id: string
- label: string
- href: string
- icon: ReactNode
- isActive: boolean

---

## Assinaturas esperadas

<!-- Hook principal -->
useSidebarNavigation(): { items: INavigationItemViewModel[], isCollapsed: boolean, toggle: () => void }

<!-- Store (Zustand) -->
useSidebarStore(): { isCollapsed: boolean, toggle: () => void, setCollapsed: (value: boolean) => void }

<!-- Componente -->
<Sidebar />

---

## Fluxo principal

1. Usuário acessa uma rota autenticada — a `Sidebar` é renderizada no layout.
2. O hook `useSidebarNavigation` lê a rota atual via `usePathname()` e marca o item correspondente como `isActive`.
3. Cada item é renderizado como um `Link` do Next.js com seu ícone e label.
4. Ao clicar no botão de toggle, o estado `isCollapsed` é alternado via `useSidebarStore`.
5. Quando colapsada, apenas os ícones são exibidos; quando expandida, ícone + label.

---

## Estados e feedbacks

- Loading → não aplicável (lista estática)
- Erro → não aplicável
- Item ativo → destaque visual (background, cor de texto, indicador lateral)
- Hover → feedback visual em cada item
- Transição suave ao colapsar/expandir

---

## Regras de negócio

- A sidebar só é exibida em rotas autenticadas — rotas públicas não a renderizam.
- O item ativo é determinado pelo prefixo da rota (ex: `/users/123` ativa o item `/users`).
- A ordem dos itens é fixa e definida em uma constante.
- Itens com `requiredRoles` (futuro) são filtrados conforme o usuário logado.

---

## Dependências

- `useSidebarStore` (Zustand) — estado de colapso
- `next/navigation` — `usePathname` e `Link`
- Constante `NAVIGATION_ITEMS` em `lib/constants.ts`

---

## Decisões técnicas da task

- Usar React Query: não — sem dados de servidor envolvidos.
- Usar Zustand: sim — `isCollapsed` é estado global de UI persistente entre páginas.
- Optimistic update: não aplicável.
- Formulário com react-hook-form: não aplicável.

---

## Restrições

- NÃO armazenar a lista de menus em React Query — é estática.
- NÃO usar `useState` para o estado de colapso (deve ser global via Zustand).
- NÃO renderizar a Sidebar em rotas públicas (`/login`, etc).
- NÃO acoplar a Sidebar a um módulo específico — é parte do layout global.
- NÃO usar classes CSS ou texto como seletor de testes — usar `data-testid`.

---

## Estrutura esperada

components/
- ui/organisms/sidebar/
  - sidebar.tsx
  - sidebar-item.tsx
  - sidebar-toggle.tsx

hooks/
- use-sidebar-navigation.hook.ts

stores/
- sidebar.store.ts

lib/
- constants.ts (adicionar `NAVIGATION_ITEMS`)

types/
- navigation.types.ts

---

## Cenários de teste adicionais

- Item correspondente à rota atual recebe estado ativo.
- Rota com sub-path (ex: `/users/123`) ativa o item pai (`/users`).
- Toggle alterna o estado `isCollapsed` corretamente.
- Quando colapsada, apenas ícones são renderizados (labels ocultos).
- Sidebar não é renderizada em rotas públicas listadas no middleware.
- Cada item de menu navega para o `href` correto ao ser clicado.

---

## Definition of Done

- [ ] Fluxo principal implementado
- [ ] Estados de loading, error e success tratados (quando aplicável)
- [ ] Testes unitários (100%)
- [ ] Testes de integração (navegação, item ativo, toggle)
- [ ] `data-testid` em todos os elementos interativos
- [ ] Sem violação de naming convention
- [ ] Estado de colapso via Zustand — não via React Query nem `useState` local