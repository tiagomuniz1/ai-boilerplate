# Template — `tasks/frontend/<slug>/task-frontend.md`

Mesmas regras gerais do template de backend: português, denso, cite arquivo:linha sempre que a decisão vier de código existente, omita seções que genuinamente não se aplicam.

```markdown
# Task — <Nome da Feature> (Frontend)

## Descrição
Um parágrafo: o problema real que está sendo resolvido (de preferência a partir de um sintoma concreto observável na UI hoje, não uma descrição abstrata) e o que fica fora de escopo.

---

## Contexto
- Achados concretos no código atual (grep) — nomes de arquivo, linha, o que está duplicado/errado/faltando. Sempre que possível, cite os dois lados de uma inconsistência lado a lado (ex.: dois mapas de label desalinhados em arquivos diferentes).
- O que já existe e deve ser reaproveitado, não duplicado (utils, hooks, componentes) — nomear a função/arquivo exato.
- Referência à regra de negócio em `ai/context/permissions.md` (ou outro doc de contexto) que embasa o texto/comportamento esperado — citar a seção.

---

## Contratos
Tipos/constantes novos ou alterados (mostrar o shape completo — `Record<Enum, string>`, interface de modelo, etc.). Se for um arquivo novo compartilhado entre duas telas, deixar claro que é **um único arquivo fonte**, não duplicado.

---

## Assinaturas esperadas
Funções/hooks/utils novos e de onde vêm as dependências que serão importadas (não recriadas). Se algo precisa ser extraído de um componente para um util compartilhado antes de poder ser importado em outro lugar, dizer isso explicitamente.

---

## Fluxo principal
Por componente/tela afetada, uma sub-seção com passos numerados (o que muda, na ordem em que muda). Sempre que houver estado dependente de outro campo (ex.: descrição que muda com a seleção), citar o mecanismo exato já em uso no projeto (`watch()` do react-hook-form, React Query, etc.) em vez de inventar um novo padrão de estado.

---

## Fluxos alternativos
Casos em que a informação nova não aparece (roles/condições que não se aplicam) e comportamento de degradação graciosa quando uma busca auxiliar falha (nunca quebrar a tela — omitir a seção silenciosamente, mesmo padrão já usado no projeto).

---

## Regras de negócio
O que muda e o que **não** muda no modelo/permissões (a maioria das tasks de frontend é só apresentação — deixar isso explícito quando for o caso, para não sugerir mudança de backend por engano).

---

## Permissões na UI
Quem vê o quê (sem mudança de permissão real, a menos que a task seja sobre isso) — uma frase costuma bastar quando não há tabela de permissões nova envolvida.

---

## Decisões técnicas
Tabela curta: decisão → escolha. Ex.: fonte única do label, texto fiel a qual doc, reaproveitamento de qual util, como o vínculo entre duas entidades é buscado (endpoint já existente com filtro, não endpoint novo).

---

## Restrições
Lista de "NÃO fazer" explícita — a mesma que vai para o `prompt-frontend.md`. Sempre incluir as restrições estruturais do projeto que valem (nenhum tipo de axios fora de `lib/api-client.ts`, dados de API nunca em Zustand, sem duplicar util/constante existente) mais as específicas desta task.

---

## Estrutura esperada
Árvore de arquivos novos/modificados:
```
apps/frontend/
  lib/ ... (novo) (+ .spec)
  components/features/<feature>/
    components/ ... → MODIFICAR/novo
    hooks/ ... (novo) (+ .spec)
    utils/ ... (novo, se extraído) (+ .spec)

cypress/e2e/<feature>/ ...-cy.ts (novo)
```

---

## Cenários de teste

### Unitários
Casos objetivamente verificáveis (exaustividade de um `Record`, comportamento de um util puro).

### Integração
Por componente: loading/error/success, e o comportamento novo especificamente (o que aparece, o que não aparece, condição que dispara cada um).

### E2E
Fluxo completo do ponto de vista do usuário, incluindo o cenário que motivou a task (reproduzir o sintoma original e confirmar que não ocorre mais). Lembrar: **toda funcionalidade nova ou alterada precisa de teste E2E, por menor que seja** — esta seção nunca fica vazia.

---

## Definition of Done
Checklist `- [ ]` espelhando os pontos centrais das seções acima. Termina sempre com:
- [ ] Testes unitários 100%
- [ ] Testes de integração (loading/error/success)
- [ ] E2E cobrindo o fluxo novo/alterado
- [ ] Naming convention e estrutura seguidas
```
