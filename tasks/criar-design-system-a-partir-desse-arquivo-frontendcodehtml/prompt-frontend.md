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
# Task — Criar Design System Base (Frontend)

## Descrição
Criar o design system base do frontend a partir do arquivo `frontend-code.html`, extraindo tokens visuais (cores, tipografia, espaçamentos) e implementando os componentes atômicos (atoms, molecules, organisms) reutilizáveis em Tailwind CSS, garantindo consistência visual em toda a aplicação.

---

## Contexto
- O arquivo `frontend-code.html` contém a referência visual completa do produto (layout, cores, tipografia, componentes)
- O design system será a fundação para todas as features futuras — qualquer tela nova consumirá esses componentes
- Tokens devem ser configurados via `tailwind.config.ts` para serem usados de forma declarativa
- Componentes seguem a estrutura **Atomic Design**: `atoms → molecules → organisms`
- Não há integração com API nesta task — é puramente camada de UI

---

## Contratos

### Input
N/A — task de UI sem dados de API. Cada componente recebe suas próprias `props` tipadas localmente.

### Output
N/A — entregáveis são componentes React reutilizáveis e tokens Tailwind.

---

## Assinaturas esperadas

```ts
// Exemplos de componentes esperados (props tipadas como interface local)

// Atoms
<Button variant="primary" | "secondary" | "ghost" size="sm" | "md" | "lg" disabled isLoading />
<Input type label error helperText />
<Label htmlFor required />
<Icon name size />
<Typography variant="h1" | "h2" | "body" | "caption" />

// Molecules
<FormField label error>{children}</FormField>
<Card title>{children}</Card>
<Alert variant="success" | "error" | "warning" | "info" />

// Organisms
<Header />
<Sidebar />
<Modal isOpen onClose title>{children}</Modal>
```

---

## Fluxo principal

1. Analisar `frontend-code.html` e extrair tokens visuais (cores, fontes, espaçamentos, radius, shadows)
2. Configurar `tailwind.config.ts` com os tokens extraídos (theme.extend)
3. Configurar fontes globais em `app/layout.tsx` (via `next/font`)
4. Implementar atoms em `components/ui/atoms/`
5. Implementar molecules em `components/ui/molecules/`
6. Implementar organisms em `components/ui/organisms/`
7. Documentar variantes e exemplos de uso de cada componente
8. Garantir acessibilidade básica (aria-labels, foco visível, contraste)

---

## Estados e feedbacks

- **Button** → estados `default`, `hover`, `focus`, `disabled`, `loading` (com spinner)
- **Input** → estados `default`, `focus`, `error`, `disabled`
- **Loading global** → componente `Skeleton` para placeholders
- **Erro** → componente `ErrorMessage` com texto amigável

---

## Regras de negócio

- Todas as cores, espaçamentos e fontes devem vir do `tailwind.config.ts` — **nunca valores hardcoded** no JSX (ex: `text-[#FF0000]`)
- Componentes devem ser **agnósticos de domínio** — sem referência a `User`, `Auth` etc.
- Componentes devem aceitar `className` para extensão pontual (via `clsx` ou `tailwind-merge`)
- Acessibilidade: todo input precisa de `label` associado; todo botão precisa de texto ou `aria-label`
- Foco visível obrigatório em todos os elementos interativos

---

## Dependências

- `tailwindcss` (já configurado)
- `clsx` + `tailwind-merge` (para composição de classes)
- `next/font` (para fontes)
- Nenhuma dependência de service ou store — design system é stateless

---

## Decisões técnicas da task

- Usar React Query: **não** — sem chamadas de API
- Usar Zustand: **não** — componentes são stateless ou usam `useState` local
- Optimistic update: **não aplicável**
- Formulário com react-hook-form: **não nesta task** — apenas componentes que serão integráveis com `react-hook-form` futuramente (via `forwardRef`)
- Componentes devem usar `forwardRef` quando aplicável (Input, Button) para integração futura com `react-hook-form`

---

## Restrições

- NÃO usar valores arbitrários do Tailwind (`text-[#xxx]`, `p-[13px]`) — sempre tokens do tema
- NÃO criar componentes acoplados a domínio (ex: `UserCard` não pertence ao DS — pertence à feature)
- NÃO usar bibliotecas de UI prontas (ex: MUI, Chakra) — implementação própria com Tailwind
- NÃO importar `axios` ou qualquer service
- NÃO usar Zustand dentro dos componentes do DS
- NÃO duplicar lógica de estilo — extrair em `cn()` utility (`clsx + tailwind-merge`)

---

## Estrutura esperada

```
apps/frontend/
  app/
    layout.tsx          → carregar fontes globais
    globals.css         → reset + base
  components/ui/
    atoms/
      button/
        button.tsx
        button.test.tsx
      input/
      label/
      icon/
      typography/
      skeleton/
    molecules/
      form-field/
      card/
      alert/
    organisms/
      header/
      sidebar/
      modal/
  lib/
    cn.ts               → utility clsx + tailwind-merge
  tailwind.config.ts    → tokens do design system
```

---

## Cenários de teste adicionais

- Button renderiza variantes (primary, secondary, ghost) com classes corretas
- Button exibe spinner quando `isLoading=true` e fica desabilitado
- Input exibe mensagem de erro quando prop `error` é passada
- Input encaminha `ref` corretamente (forwardRef)
- FormField associa `label` ao `input` via `htmlFor`/`id`
- Modal fecha ao pressionar `Esc` e ao clicar no backdrop
- Componentes aceitam `className` adicional sem sobrescrever estilos base
- Foco é visível ao navegar com `Tab` (snapshot de classes)

---

## Definition of Done

- [ ] Tokens extraídos do `frontend-code.html` e configurados em `tailwind.config.ts`
- [ ] Fontes carregadas via `next/font`
- [ ] Atoms implementados (Button, Input, Label, Icon, Typography, Skeleton)
- [ ] Molecules implementados (FormField, Card, Alert)
- [ ] Organisms implementados (Header, Sidebar, Modal)
- [ ] Utility `cn()` criado em `lib/cn.ts`
- [ ] Todos os componentes usam `forwardRef` quando aplicável
- [ ] Acessibilidade básica garantida (labels, aria, foco visível)
- [ ] Testes unitários (100%) para cada componente
- [ ] Testes de integração para componentes interativos (Modal, FormField)
- [ ] Sem valores hardcoded de cor/spacing no JSX
- [ ] Sem warnings de lint / `console.log`
- [ ] Segue naming convention (PascalCase para componentes, kebab-case para arquivos)