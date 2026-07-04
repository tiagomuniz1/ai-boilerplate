# Plano — Exames da Consulta (Solicitação + Resultado)

## Objetivo

Permitir que o **médico solicite exames para o paciente a partir da tela da consulta** (`/[slug]/appointments/[id]`), com **um ou mais itens por solicitação** (nome do exame em texto livre + observação opcional), e que, posteriormente, o **mesmo médico anexe o(s) arquivo(s) de resultado** (PDF/imagem) recebido(s) do laboratório. O sistema **persiste um snapshot imutável em JSON** da solicitação e **gera um PDF do pedido sob demanda** — papel timbrado da clínica (nome, endereço e logo) + área de assinatura/carimbo do médico (com CRM) — para download.

**O PDF do pedido nunca é armazenado** — é renderizado a cada download a partir do snapshot. Os **arquivos de resultado**, ao contrário, são **armazenados** (upload real para S3, via o mesmo `IStorageAdapter` já usado no upload de logomarca da clínica) — é a primeira feature do projeto que precisa manter esses arquivos de forma persistente. Esta feature espelha o módulo de **receitas (`prescriptions`)** e **atestados (`medical-certificates`)** na parte de solicitação (documento emitido, snapshot imutável, PDF sob demanda), e o módulo de **upload de logomarca** na parte de resultado (upload real via `IStorageAdapter`), adaptado para múltiplos arquivos e com efeito colateral no status da solicitação.

---

## Decisões centrais (confirmadas)

| Tema | Decisão |
|---|---|
| **Quem solicita** | Somente **DOCTOR**, na própria consulta. |
| **Quem registra resultado** | Somente **DOCTOR**, na própria consulta — mesma regra da solicitação (nem ADMIN, nem USER/recepção). |
| **Itens por pedido** | **Múltiplos itens** numa única solicitação (ex.: hemograma + raio-x), como receitas com múltiplos medicamentos. |
| **Catálogo de exames** | **Nenhum** nesta versão — nome do exame é **texto livre** digitado pelo médico. |
| **Resultado** | **Upload de arquivo** (PDF/imagem) — sem estruturar valores/dados de laudo. **Múltiplos arquivos** podem ser anexados ao longo do tempo à mesma solicitação. |
| **Status** | `requested` → `completed` automaticamente ao anexar o **primeiro** resultado; volta a `requested` se o **último** resultado ativo for removido. |
| **Armazenamento do resultado** | S3 via `IStorageAdapter` (mesmo adapter da logomarca da clínica) — URL pública sem expiração (mesmo padrão hoje existente; ver nota de trade-off na task de resultado). |

**Regra adicional:** não solicitar exame em consulta `CANCELLED` (→ `422`). Solicitação permitida com a consulta `SCHEDULED` ou `COMPLETED` (não é bloqueada pela conclusão, diferente do prontuário).

---

## Modelo de dados

### Enum `ExamRequestStatus` (`packages/shared/src/enums/exam-request-status.enum.ts`)

```ts
export enum ExamRequestStatus {
  REQUESTED = 'requested',
  COMPLETED = 'completed',
}
```

### Entidade `ExamRequest` (tabela `exam_requests`)

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid | isolamento multi-tenant |
| `appointment_id` | uuid | indexado — listar por consulta |
| `patient_id` | uuid | consulta/histórico |
| `doctor_id` | uuid | consulta/histórico |
| `snapshot` | jsonb | snapshot imutável dos itens (abaixo) |
| `status` | varchar(20), default `requested` | **único campo mutável** — atualizado pela task de resultado |
| `issued_at` | timestamptz | momento da solicitação |
| `created_at` / `updated_at` | timestamptz | |
| `deleted_at` | timestamptz null | soft delete |

- Sem `@ManyToOne`/FK reais — colunas uuid puras, mesmo padrão de `Prescription`/`MedicalCertificate`.
- Colunas union exigem `type` explícito (regra do `backend.md`).

### Entidade `ExamResult` (tabela `exam_results`) — criada na task de resultado

| Coluna | Tipo | Observações |
|---|---|---|
| `id` | uuid PK | |
| `clinic_id` | uuid | denormalizado — isolamento de tenant sem depender de join com `exam_requests` |
| `exam_request_id` | uuid | sem FK real, indexado |
| `file_url` | text | URL pública no S3 |
| `file_name` | varchar(255) | nome original do arquivo |
| `mime_type` | varchar(100) | |
| `file_size_bytes` | integer | |
| `uploaded_by_user_id` | uuid | auditoria — sempre o médico dono da consulta |
| `created_at` / `updated_at` | timestamptz | |
| `deleted_at` | timestamptz null | soft delete |

### Snapshot JSON (`ExamRequestSnapshot`, em `@app/shared`)

```ts
export interface ExamRequestSnapshot {
  issuedAt: string
  clinic: {
    name: string
    address: { street: string | null; number: string | null; complement: string | null; neighborhood: string | null; city: string | null; state: string | null; zipCode: string | null } | null
    logoUrl: string | null
  }
  doctor: { name: string; crmNumber: string; specialtyName: string | null }
  patient: { name: string; documentNumber: string }
  items: Array<{ name: string; observations: string | null }>
  notes: string | null
}
```

---

## Ordem de execução

Executar **uma a uma, nesta ordem**. O backend precede o frontend porque os DTOs no `@app/shared` são contrato dos dois lados.

Cada task é uma pasta com dois arquivos: `task-<area>.md` (especificação completa) e `prompt-<area>.md` (cabeçalho de execução + a especificação, arquivo a ser enviado ao agente de implementação). Estrutura: `tasks/backend/<task>/` e `tasks/frontend/<task>/`, espelhando `tasks/done/`. Ao concluir uma task, mover a pasta para `tasks/done/<area>/`.

| # | Área | Task (pasta) | Depende de | Resumo |
|---|---|---|---|---|
| 1 | backend | `criar-modulo-de-solicitacao-de-exames` | — | Entidade `ExamRequest` + CRUD (solicitar / listar-por-consulta / ver / excluir), snapshot com múltiplos itens, enum/DTOs/types no `@app/shared`, migration, cache, RBAC. |
| 2 | backend | `gerar-pdf-do-pedido-de-exames` | #1 | Endpoint `GET /exam-requests/:id/pdf` com `pdfmake`: timbre, lista numerada dos itens solicitados, rodapé com assinatura/CRM. |
| 3 | backend | `criar-modulo-de-resultado-de-exames` | #1 | Entidade `ExamResult` + upload multi-arquivo via `IStorageAdapter`, exclusão de resultado, efeito colateral no `status` da solicitação, cascade de delete (modifica `DeleteExamRequestUseCase` da task #1), migration. |
| 4 | frontend | `criar-tela-de-exames-na-consulta` | #1, #2, #3 | Aba "Exames" na tela da consulta: solicitar (itens dinâmicos), listar com badge de status, baixar PDF do pedido, anexar/remover resultado, excluir pedido. Liga o `count` na aba e no card de resumo. |

### Grafo de dependências

```
#1 ─┬─> #2 ─┐
    ├─> #3 ─┤
    └───────┴─> #4
```

### Flexibilidade de ordem
- **#2** e **#3** dependem apenas de **#1** e são independentes entre si — podem ser feitas em paralelo ou em qualquer ordem.
- **#4** depende das três anteriores (precisa do CRUD, do endpoint de PDF e do upload de resultado para o fluxo completo).
- Ordem recomendada, por ser linear e sem surpresas: #1 → #2 → #3 → #4.

---

## Migrations (ordem dos timestamps)

| Task | Migration |
|---|---|
| #1 | `1752900000000-create-exam-requests-table` |
| #3 | `1753000000000-create-exam-results-table` |

> O último timestamp existente é `1752800000000` (medical-certificates); os de exames vêm depois.

---

## Dependências novas
- Nenhuma. `pdfmake`/`@types/pdfmake` (receitas/atestados) e `multer`/`@types/multer` + `@aws-sdk/client-s3` (upload de logomarca) já são dependências do backend.

---

## Ponto de integração no frontend (já preparado)

A aba **Exames** e a linha "Exames" no card "Documentos da consulta" já existem como placeholders:
- `apps/frontend/app/[slug]/(authenticated)/appointments/[id]/page.tsx` — tab id `'exames'` renderizando `ExamesPlaceholder` (stub local, a remover); a tab está incondicional no `tabItems` (sem `count` nem gating por `canManage`).
- `apps/frontend/components/features/appointments/components/resumo-tab.tsx` — `DocumentRow` "Exames" com `count={0}` fixo (a ligar ao count real).

---

## Permissões (atualizar `ai/context/permissions.md` ao final)

Nova seção **"Exames (`/exam-requests`)"**:

| Ação | ADMIN | DOCTOR | USER | PATIENT |
|---|:---:|:---:|:---:|:---:|
| Solicitar exames | ✗ | ✓ própria consulta | ✗ | ✗ |
| Listar por consulta | ✓ | ✓ própria | ✗ | ✗ |
| Ver / baixar PDF do pedido | ✓ | ✓ própria | ✗ | ✗ |
| Anexar resultado | ✗ | ✓ própria | ✗ | ✗ |
| Remover resultado | ✗ | ✓ própria | ✗ | ✗ |
| Excluir pedido | ✓ | ✓ própria | ✗ | ✗ |

> Só o DOCTOR solicita e anexa resultado — mesma lógica de receitas/atestados (documento assinado pelo médico responsável pela consulta). ADMIN tem leitura e pode excluir o pedido para fins de gestão administrativa, mas não solicita nem mexe em resultado (não é o profissional que acompanha o exame).

---

## Definition of Done (transversal)
- Testes unitários 100% + integração; E2E nos fluxos críticos (frontend).
- Sem violação de arquitetura; sem `process.env` fora de `env.config.ts` (backend); sem axios fora do API Client (frontend); dados de API via React Query (nunca Zustand).
- Snapshot da solicitação **sempre** persistido como JSON; PDF do pedido **nunca** persistido; arquivos de resultado **sempre** persistidos via `IStorageAdapter`.
- Ao finalizar a feature: atualizar `ai/context/permissions.md` (adicionar a matriz de Exames) e o `CHANGELOG.md` de cada app.
- Ao concluir cada task, mover a pasta para `tasks/done/<area>/`.
