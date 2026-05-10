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
# Task — Toggle Dark/Light Mode (Frontend)

## Descrição
Implementar um ícone/botão no header da aplicação que permita ao usuário alternar entre os temas dark e light. A preferência deve ser persistida e respeitar a preferência do sistema operacional no primeiro acesso.

---

## Contexto
- A aplicação usa Tailwind CSS — o tema escuro será controlado via classe `dark` no elemento `<html>` (estratégia `darkMode: 'class'` do Tailwind).
- A preferência do tema é estado **global de UI** (não vem da API) — portanto deve ser gerenciada via **Zustand**, não React Query.
- A preferência do usuário deve ser persistida em `localStorage` (via `zustand/middleware/persist`) para sobreviver entre sessões.
- No primeiro acesso (sem preferência salva), respeitar `prefers-color-scheme` do sistema operacional.
- Evitar flash of incorrect theme (FOIT) na carga inicial — aplicar o tema antes da hidratação do React.

---

## Contratos

### Input (ação do usuário)
ToggleThemeInput:
- (sem parâmetros — apenas alterna o estado atual)

### Output (estado exposto pela store)
IThemeState:
- theme: `'light' | 'dark'`
- toggleTheme: `() => void`
- setTheme: `(theme: 'light' | 'dark') => void`

---

## Assinaturas esperadas

```ts
// Componente
<ThemeToggle />

// Store (Zustand)
useThemeStore(): IThemeState

// Hook auxiliar (aplica classe no <html>)
useApplyTheme(): void
```

> Não há service, use-case ou mapper — esta task não envolve a camada de API.

---

## Fluxo principal

1. Na carga inicial, o app lê a preferência salva (`localStorage`) ou cai no fallback `prefers-color-scheme`.
2. O hook `useApplyTheme` aplica/remove a classe `dark` no `<html>` sempre que o estado da store mudar.
3. O componente `ThemeToggle` exibe um ícone (sol no modo dark, lua no modo light).
4. Ao clicar no botão, `toggleTheme()` é chamado — o estado é atualizado e persistido.
5. A classe `dark` é refletida no DOM e o Tailwind reaplica os estilos.

---

## Estados e feedbacks

- Loading → não aplicável (estado síncrono local).
- Erro → não aplicável.
- Sucesso → ícone troca instantaneamente (sol ↔ lua) e a UI inteira reflete o novo tema.
- Acessibilidade → botão com `aria-label` descritivo (`"Alternar para modo escuro"` / `"Alternar para modo claro"`).

---

## Regras de negócio

- Apenas dois temas suportados: `light` e `dark`.
- Sem preferência salva → usar `prefers-color-scheme` do SO.
- A preferência do usuário sobrescreve a do sistema após a primeira interação.
- A troca deve ser instantânea — sem reload de página.
- Evitar FOIT (flash) na carga inicial — script inline no `<head>` ou via `next-themes`-like approach manual.

---

## Dependências

- `useThemeStore` (Zustand store nova em `stores/theme.store.ts`)
- Ícones (lucide-react ou similar — `Sun`, `Moon`)

---

## Decisões técnicas da task

- Usar React Query: **não** — não há dado de API.
- Usar Zustand: **sim** — preferência de tema é estado global de UI, com persistência via middleware `persist`.
- Optimistic update: **não aplicável**.
- Formulário com react-hook-form: **não** — apenas um botão toggle.

---

## Restrições

- NÃO armazenar o tema em React Query.
- NÃO usar `useState` no componente para o tema (deve vir da store global).
- NÃO importar Zustand dentro de services, use-cases ou mappers.
- NÃO causar flash de tema incorreto na carga inicial.
- NÃO acoplar a lógica de aplicação da classe `dark` dentro do componente — usar hook dedicado (`useApplyTheme`).

---

## Estrutura esperada

```
apps/frontend/
  components/
    ui/molecules/
      theme-toggle/
        theme-toggle.tsx
        theme-toggle.test.tsx
  hooks/
    use-apply-theme.hook.ts
    use-apply-theme.hook.test.ts
  stores/
    theme.store.ts
    theme.store.test.ts
```

> Como é um recurso transversal de UI (não pertence a um domínio de negócio), fica em `components/ui/molecules/` e não em `components/features/`.

---

## Cenários de teste adicionais

- Estado inicial sem preferência salva e SO em dark → store inicia com `theme = 'dark'`.
- Estado inicial sem preferência salva e SO em light → store inicia com `theme = 'light'`.
- Estado inicial com preferência salva no `localStorage` → store respeita o valor persistido (ignora SO).
- Clique no botão alterna `light → dark` e atualiza `localStorage`.
- Clique no botão alterna `dark → light` e atualiza `localStorage`.
- `useApplyTheme` adiciona a classe `dark` no `<html>` quando `theme === 'dark'`.
- `useApplyTheme` remove a classe `dark` no `<html>` quando `theme === 'light'`.
- Botão renderiza ícone `Moon` quando o tema é `light`.
- Botão renderiza ícone `Sun` quando o tema é `dark`.
- Botão expõe `aria-label` correto conforme o tema atual.

---

## Definition of Done

- [ ] Fluxo principal implementado (toggle + persistência + aplicação da classe)
- [ ] Estados de loading, error e success tratados (n/a — estado síncrono)
- [ ] Testes unitários (100%) da store e do hook
- [ ] Testes de integração do componente (render em ambos os temas + interação de clique)
- [ ] Sem flash de tema incorreto na carga inicial
- [ ] `aria-label` correto e acessibilidade validada
- [ ] Tailwind configurado com `darkMode: 'class'`
- [ ] Nenhum dado da API armazenado em Zustand (somente preferência de UI)