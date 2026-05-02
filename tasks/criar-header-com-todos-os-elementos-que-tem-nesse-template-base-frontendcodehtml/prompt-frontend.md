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
# Task — Header Global da Aplicação (Frontend)

## Descrição
Implementar o componente `Header` global da aplicação, replicando todos os elementos visuais e funcionais presentes no template base `frontend-code.html`. O header deve ser reutilizável, responsivo e integrado ao layout principal da aplicação.

---

## Contexto
- O `frontend-code.html` é o template base de referência visual fornecido pelo design.
- Todos os elementos do header presentes no template devem ser fielmente reproduzidos (logo, navegação, ações de usuário, ícones, menu mobile, etc).
- O componente será montado no `app/layout.tsx` via composição (ou em um layout específico), permanecendo visível em todas as rotas autenticadas.
- Itens interativos (ex.: menu de usuário, notificações, busca) devem seguir os padrões de acessibilidade e responsividade.
- Estado do usuário autenticado vem da `auth.store` (Zustand) — nunca buscar dados do usuário direto via API dentro do header.

---

## Contratos

### Input (props do componente)
IHeaderProps:
- variant?: 'default' | 'compact'
- onLogoClick?: () => void

### Output (modelo consumido pela UI)
IHeaderUserModel:
- id: string
- fullName: string
- email: string
- avatarUrl?: string

---

## Assinaturas esperadas

<!-- Componente principal -->
Header(props: IHeaderProps): JSX.Element

<!-- Hook auxiliar para dados do usuário logado (consome store) -->
useHeaderUser(): { user: IHeaderUserModel | null; isAuthenticated: boolean }

<!-- Hook para ação de logout -->
useLogout(): { logout: () => Promise<void>; isPending: boolean }

---

## Fluxo principal

1. Componente `Header` é renderizado no layout global.
2. Hook `useHeaderUser` lê dados do usuário autenticado da `auth.store`.
3. Renderiza:
   - Logo (link para home)
   - Navegação principal (links definidos em `constants.ts`)
   - Barra de busca (se presente no template)
   - Ícones de ação (notificações, configurações, etc)
   - Menu de usuário (avatar + dropdown com perfil/logout)
   - Botão de menu mobile (hamburger)
4. Em telas menores, navegação colapsa em menu lateral/dropdown.
5. Ao clicar em "Sair", dispara `useLogout` → invalida sessão → redireciona para `/login`.

---

## Estados e feedbacks

- Loading (logout em andamento) → botão desabilitado + spinner inline
- Erro (falha no logout) → toast com mensagem amigável
- Sucesso (logout) → redirect para `/login`
- Sem usuário autenticado → exibir CTA de login (caso o header seja usado em rotas públicas)

---

## Regras de negócio

- Header deve ser fixo no topo (`sticky`/`fixed`) conforme template.
- Em rotas públicas, esconder ações exclusivas de usuário autenticado.
- Avatar usa `fullName` para gerar iniciais quando `avatarUrl` não existir.
- Navegação destaca o item ativo conforme rota atual (`usePathname`).
- Menu mobile fecha automaticamente ao navegar.

---

## Dependências

- `auth.store` (Zustand) — dados do usuário e ação de logout
- `auth.service` — chamada de logout no backend
- `lib/constants.ts` — definição dos itens de navegação
- Componentes atômicos: `Avatar`, `Button`, `Dropdown`, `IconButton`

---

## Decisões técnicas da task

- Usar React Query: sim — `useMutation` para logout
- Usar Zustand: sim — leitura de usuário autenticado já reside na `auth.store`
- Optimistic update: não
- Formulário com react-hook-form: não se aplica

---

## Restrições

- NÃO importar `axios` — usar apenas `apiClient` via service
- NÃO armazenar dados do usuário em `useState` local — usar `auth.store`
- NÃO duplicar lógica de autenticação dentro do header
- NÃO usar classes CSS do template diretamente sem migrar para Tailwind
- NÃO renderizar o header em rotas que não devem exibi-lo (ex.: `/login`)

---

## Estrutura esperada

components/
- ui/organisms/
  - header/
    - header.tsx
    - header.test.tsx
    - components/
      - header-logo.tsx
      - header-nav.tsx
      - header-user-menu.tsx
      - header-mobile-menu.tsx
    - hooks/
      - use-header-user.hook.ts
      - use-logout.hook.ts
    - types/
      - header.types.ts

---

## Cenários de teste adicionais

- Renderiza todos os elementos do template (logo, nav, busca, ícones, menu de usuário)
- Destaca corretamente o item de navegação ativo
- Exibe iniciais quando `avatarUrl` é ausente
- Menu mobile abre/fecha ao clicar no hamburger
- Menu mobile fecha ao clicar em um link
- Logout: dispara mutation, desabilita botão durante `isPending`, redireciona em sucesso
- Logout: exibe toast amigável em caso de erro
- Esconde ações de usuário quando não autenticado
- Acessibilidade: navegação por teclado e `aria-labels` em ícones

---

## Definition of Done

- [ ] Todos os elementos do `frontend-code.html` reproduzidos no header
- [ ] Componente responsivo (desktop, tablet, mobile)
- [ ] Estados de loading, error e success do logout tratados
- [ ] Item de navegação ativo destacado corretamente
- [ ] Testes unitários (100%)
- [ ] Testes de integração (loading / error / success do logout)
- [ ] Acessibilidade básica (aria-labels, navegação por teclado)
- [ ] Segue naming convention e arquitetura de camadas