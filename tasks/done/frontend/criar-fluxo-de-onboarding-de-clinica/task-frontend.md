# Task — Fluxo de Onboarding de Clínica (Frontend)

## Descrição
Implementar a página pública de registro de nova clínica. Em um único formulário, o usuário informa os dados da clínica e do primeiro administrador. Após o cadastro bem-sucedido, é redirecionado para o login.

**Pré-requisito:** task backend **criar-fluxo-de-onboarding-de-clinica** concluída (endpoint `POST /clinics/register` disponível).

---

## Contexto
- Página pública — acessível sem autenticação (`/register`).
- Usuário autenticado que acessa `/register` é redirecionado para `/dashboard`.
- O formulário captura dados da clínica (nome, slug opcional) e do admin (nome, email, senha).
- Após cadastro bem-sucedido, a clínica já existe e o admin pode fazer login imediatamente.
- Não há etapas de verificação de email nesta versão — o acesso é imediato.

---

## Contratos

### Tipo local do formulário

```ts
// types/register.types.ts
export interface IRegisterClinicInput {
  clinicName: string
  slug?: string
  adminFullName: string
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string  // apenas validação local — não enviado à API
}
```

---

## Assinaturas esperadas

```ts
// use-case
registerClinicUseCase(input: Omit<IRegisterClinicInput, 'adminPasswordConfirm'>): Promise<RegisterClinicResponseDto>

// hook
useRegisterClinic(): UseMutationResult<RegisterClinicResponseDto, IApiError, IRegisterClinicInput>

// service
clinicsService.register(data: RegisterClinicDto): Promise<RegisterClinicResponseDto>
```

---

## Fluxo principal

### Registro (`/register`)
1. Página pública renderiza `RegisterClinicForm`.
2. Formulário dividido em duas seções visuais: **Dados da clínica** e **Dados do administrador**.
3. Preview do slug gerado a partir do nome da clínica em tempo real.
4. Validação local (zod) antes do envio:
   - `clinicName` min 3 caracteres
   - `slug` formato kebab-case (opcional)
   - `adminFullName` min 3 caracteres
   - `adminEmail` formato email válido
   - `adminPassword` min 8 caracteres
   - `adminPasswordConfirm` deve ser igual a `adminPassword`
5. Submit dispara `useRegisterClinic` → `POST /clinics/register`.
6. Sucesso → exibe mensagem "Clínica criada com sucesso!" + link para login.
7. Erro `409` (slug ou email duplicado) → mensagem amigável no campo correspondente via `setError()`.

---

## Estados e feedbacks

- Loading → botão com spinner e texto "Criando clínica..." e desabilitado
- Erro de validação local → mensagens abaixo de cada campo
- Erro `409` de slug → mensagem no campo slug: "Este endereço já está em uso"
- Erro `409` de email → mensagem no campo email: "Este e-mail já está cadastrado"
- Sucesso → banner de sucesso com instruções para fazer login (não redireciona automaticamente — confirmar que o usuário leu)

---

## Regras de negócio

- `adminPasswordConfirm` é apenas validação local — **não enviado à API**.
- Preview de slug: derivado do `clinicName` em tempo real (mesmo algoritmo do backend: lowercase, espaços → hífens, remove especiais). Substituído pelo valor manual se o usuário preencher o campo `slug`.
- Após sucesso, o formulário é limpo e substituído por uma mensagem de confirmação com botão "Ir para o login".
- Usuário autenticado redirecionado ao `/dashboard` antes de renderizar a página.

---

## Dependências

- `clinicsService` (existente após a task de telas de clínicas — adicionar método `register`)
- `apiClient` (existente)
- `@app/shared` — DTOs (`RegisterClinicDto`, `RegisterClinicResponseDto`)
- React Hook Form + zod
- `next/navigation` para verificar autenticação

---

## Decisões técnicas da task

- React Query: **sim** — `useMutation` para o registro
- Zustand: **não** — nenhum estado global envolvido
- Formulário: react-hook-form + zod — campo `adminPasswordConfirm` validado com `superRefine`
- Redirecionamento pós-sucesso: **não automático** — exibir mensagem de confirmação para o usuário

---

## Restrições

- NÃO enviar `adminPasswordConfirm` à API.
- NÃO autenticar o usuário automaticamente após o registro — redirecionar para o login.
- NÃO importar `axios` fora de `lib/api-client.ts`.
- NÃO armazenar dados da clínica recém-criada em Zustand.
- NÃO exibir a senha em nenhum momento na tela.

---

## Estrutura esperada

```
apps/frontend/
  app/
    register/
      page.tsx                          → página pública de registro

  components/features/clinics/
    components/
      register-clinic-form.tsx          (NOVO)
    hooks/
      use-register-clinic.hook.ts       (NOVO)
    use-cases/
      register-clinic.use-case.ts       (NOVO)
    services/
      clinics.service.ts                (atualizado — adicionar método register)
    types/
      clinic.types.ts                   (atualizado — adicionar IRegisterClinicInput)
```

---

## Cenários de teste adicionais

- Formulário com campos válidos → exibe mensagem de sucesso após submit
- Slug preview atualiza em tempo real ao digitar o nome da clínica
- `adminPasswordConfirm` diferente de `adminPassword` → erro de validação local
- Email com formato inválido → erro de validação local
- Erro `409` de slug → mensagem no campo slug
- Erro `409` de email → mensagem no campo email do admin
- Botão desabilitado durante o envio
- Usuário autenticado que acessa `/register` → redirecionado para `/dashboard`
- `adminPasswordConfirm` não é enviado no payload da requisição

---

## Definition of Done

- [ ] Página pública `/register` implementada
- [ ] Formulário com duas seções (dados da clínica e dados do admin)
- [ ] Preview de slug em tempo real
- [ ] Validação local com zod (incluindo confirmação de senha)
- [ ] `adminPasswordConfirm` não enviado à API
- [ ] Mapeamento de erro `409` para campo correto via `setError()`
- [ ] Mensagem de sucesso com link para login (sem redirecionamento automático)
- [ ] Usuário autenticado redirecionado ao acessar a página
- [ ] Testes unitários com 100% de cobertura (use-case, hook)
- [ ] Testes de integração do formulário (loading / error 409 / success)
- [ ] Sem `console.log`, código comentado ou warnings de lint
