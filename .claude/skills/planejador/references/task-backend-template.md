# Template — `tasks/backend/<slug>/task-backend.md`

Copie a estrutura abaixo. Omita qualquer seção que genuinamente não se aplique (ex.: uma task de infra pura pode não ter "Permissões" nem "Migration"), mas nunca omita uma seção só por preguiça de investigar — se a informação existe no código, ela vai na task.

Escreva tudo em português, no mesmo tom seco e denso dos exemplos reais do projeto (`tasks/backend/**/task-backend.md`). Cite caminho de arquivo e número de linha sempre que a decisão vier de código existente (ex.: "`find-medical-records-by-patient.use-case.ts` (linha 33-38): sobrescreve `professionalIdFilter` sempre que `role === PROFESSIONAL`").

```markdown
# Task — <Nome da Feature> (Backend / <sub-área opcional, ex: Upload por Consulta>)

## Descrição
Um parágrafo: o que este módulo/mudança faz, e o que ele explicitamente NÃO faz (delimitar escopo — se há uma task irmã que cobre a parte que ficou de fora, cite-a pelo nome do slug).

---

## Contexto
- Qual módulo existente é o molde mais próximo a clonar (nome do use-case/arquivo real), e por quê.
- Dependências de outras tasks (se este trabalho depende de algo que ainda não existe, nomeie o slug da task da qual depende).
- Regras de autorização/dado que já existem em código real e que esta task deve replicar — cite arquivo:linha.
- Decisões de modelo de dados não óbvias (campos denormalizados, por exemplo) e a razão prática (evitar join, evitar N+1, etc.).

---

## Contratos

### Input
Rota, verbo HTTP, formato do body/query (DTO de entrada — se novo, mostrar o shape; se reaproveitado, citar o DTO existente). Validações de tamanho/tipo/formato explícitas (ex.: mimetypes aceitos, tamanho máximo).

### Output
DTO(s) de resposta (`packages/shared/src/dtos/`) — mostrar o shape completo. Deixar explícito o que NUNCA deve ser exposto (ex.: `filePath`, `password`, campos internos) e por quê. Lembrar de exportar via `index.ts`.

---

## Assinaturas esperadas

Use-cases (classes, `@Injectable`, `extends BaseUseCase`, método `execute()`):
```ts
export class NomeDoUseCase extends BaseUseCase {
  execute(...): Promise<TipoDeRetorno>
}
```

Repository interface (`abstract class`, aceitando `QueryRunner` opcional nos métodos de escrita):
```ts
export abstract class INomeRepository {
  abstract findX(...): Promise<...>
  abstract create(data: ..., queryRunner?: QueryRunner): Promise<...>
}
```

Se este trabalho for consumido por uma task futura (cascade, reexport), diga explicitamente o que deve ser exportado do módulo para isso funcionar.

---

## Fluxo principal

Para cada endpoint/operação, uma sub-seção com passos numerados, seguindo a ordem real de execução (o que o controller faz → o que o use-case valida → em que ordem → quando abre transação → quando invalida cache → o que retorna). Se não houver fluxo HTTP (ex.: task de infra/adapter), diga isso explicitamente em vez de inventar um.

Sempre explicitar:
- Qual verificação de "own-resource" é feita e como (comparação de IDs, de onde vêm)
- Se roda dentro de `runInTransaction` (e por quê — só se houver ≥2 operações atômicas)
- Qual cache é invalidado e quando (fora da transação, em `try/catch`)

---

## Fluxos alternativos
Toda condição de erro relevante e o status/exceção correspondente (404, 403, 422, etc.), incluindo casos de borda (arquivo inválido, recurso de outra clínica, dependência ausente). Comportamento de degradação graciosa (cache falha → warn e segue, storage falha na exclusão → warn e segue).

---

## Regras de negócio
Lista enxuta das regras de domínio que não são óbvias só olhando o contrato — coisas que alguém implementando sem contexto erraria (ex.: "patientId sempre derivado do appointment, nunca do cliente").

---

## Permissões
Tabela no formato de `ai/context/permissions.md`:

| Ação | ADMIN | PROFESSIONAL | USER |
|---|:---:|:---:|:---:|
| ... | ✓/✗ | ✓ própria / ✗ | ✓ (leitura) / ✗ |

Deixar explícito qual decorator (`@Roles(...)`) vai em cada endpoint e onde a checagem de "próprio recurso" acontece (sempre no use-case, nunca no controller).

---

## Dependências
Repositories/use-cases de outros módulos que serão importados (padrão cross-module já usado no projeto — citar um exemplo real), pacotes npm novos (raro — normalmente já são dependências existentes).

---

## Decisões técnicas
Tabela ou lista curta das decisões que exigiram escolha (estratégia de concorrência, TTL de cache, formato de path de storage, se usa transação ou não, índices de banco e por que existem mesmo que nenhuma query desta task os use ainda).

---

## Restrições
Lista de "NÃO fazer" explícitos — a mesma lista que depois vai (quase) verbatim para o `prompt-backend.md`. Inclua sempre as restrições estruturais do projeto que se aplicam (`process.env` fora de `env.config.ts`, sem lógica de negócio em repository/controller, sem hard delete, etc.) e as restrições específicas desta task (ex.: "não implementar a listagem por paciente nesta task" quando isso for uma task separada).

---

## Migration
(Omitir se não houver mudança de schema.)
Nome do arquivo (`<timestamp>-nome-da-migration.ts`), schema-safe (`SET search_path TO "${schema}", public`), colunas + tipos + índices, `down()` simétrico. Citar uma migration real existente como modelo de formato.

---

## Estrutura esperada
Árvore de arquivos novos/modificados, no formato:
```
apps/backend/src/modules/<modulo>/
  entities/ ...
  repositories/ ... (+ .spec)
  use-cases/ ... (+ .spec)
  controllers/ ... (+ .spec)
  <modulo>.module.ts
  tests/ <modulo>.integration.spec.ts
apps/backend/src/database/migrations/ <timestamp>-...ts
apps/backend/src/app.module.ts → MODIFICAR
packages/shared/src/dtos/ ... (novo/MODIFICAR), index.ts → MODIFICAR
```

---

## Cenários de teste
Por use-case: lista de casos (sucesso, cada exceção, cada regra de negócio, cascade se houver). Termina sempre com uma sub-seção de Integração (`<modulo>.integration.spec.ts`) cobrindo os endpoints HTTP fim a fim, por role.

---

## Definition of Done
Checklist `- [ ]` espelhando exatamente os pontos centrais das seções acima (não é genérico — cada item referencia algo concreto desta task). Termina sempre com:
- [ ] Testes unitários (100%) e integração cobrindo os cenários
- [ ] Naming convention e estrutura seguidas
```
