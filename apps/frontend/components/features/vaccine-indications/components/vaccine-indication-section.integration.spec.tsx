jest.mock('../services/vaccine-indications.service')
jest.mock('@/components/features/vaccines/services/vaccines.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { vaccineIndicationsService } from '../services/vaccine-indications.service'
import { vaccinesService } from '@/components/features/vaccines/services/vaccines.service'
import { VaccineIndicationSection } from './vaccine-indication-section'

const mockService = vaccineIndicationsService as jest.Mocked<typeof vaccineIndicationsService>
const mockVaccinesService = vaccinesService as jest.Mocked<typeof vaccinesService>

const APPOINTMENT_ID = 'appointment-uuid'

const makeDto = (overrides = {}) => ({
  id: 'indication-uuid',
  appointmentId: APPOINTMENT_ID,
  patientId: 'patient-uuid',
  patientName: 'Clara Monteiro Alves',
  professionalId: 'professional-uuid',
  professionalName: 'Dra. Helena Vasconcelos',
  issuedAt: '2026-09-04T10:00:00.000Z',
  items: [
    { vaccineId: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', doseLabel: '1ª dose', instructions: null },
    { vaccineId: 'v2', name: 'Hepatite B', abbreviation: null, doseLabel: null, instructions: null },
  ],
  notes: null,
  createdAt: '2026-09-04T10:00:00.000Z',
  ...overrides,
})

beforeEach(() => {
  jest.clearAllMocks()
  mockVaccinesService.getAll.mockResolvedValue({
    data: [
      { id: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: null, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'v2', name: 'Hepatite B', abbreviation: null, preventedDiseases: null, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
    ],
    total: 2,
    page: 1,
    limit: 200,
  } as any)
})

describe('VaccineIndicationSection (integration)', () => {
  it('mostra skeleton enquanto carrega', () => {
    mockService.getByAppointment.mockReturnValue(new Promise(() => {}))
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )
    expect(screen.getByTestId('vaccine-indication-list-skeleton')).toBeInTheDocument()
  })

  it('mostra erro quando a busca falha', async () => {
    mockService.getByAppointment.mockRejectedValue(new Error('Network error'))
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-section-error')).toBeInTheDocument()
    })
  })

  it('mostra estado vazio', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-section-empty')).toBeInTheDocument()
    })
  })

  // Ler "2 vacinas" obrigaria a abrir o PDF pra saber quais.
  it('lista as vacinas pelo nome, não pela contagem', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-item-indication-uuid')).toBeInTheDocument()
    })
    expect(screen.getByTestId('vaccine-indication-item-vaccines-indication-uuid')).toHaveTextContent(
      'Tríplice viral (SCR), Hepatite B',
    )
  })

  // Indicar vem da ficha e só na própria consulta — não do cargo.
  it('esconde o botão de emitir de quem não pode indicar', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue={false} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-item-indication-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('vaccine-indication-new-button')).not.toBeInTheDocument()
  })

  it('esconde excluir de quem não gerencia a consulta', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage={false} canIssue={false} />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-item-indication-uuid')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('vaccine-indication-delete-button-indication-uuid')).not.toBeInTheDocument()
    // Baixar o PDF continua disponível: ler o documento não é gerenciar.
    expect(screen.getByTestId('vaccine-indication-download-button-indication-uuid')).toBeInTheDocument()
  })

  it('emite uma indicação e fecha o formulário', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockResolvedValue(makeDto() as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    const select = await screen.findByTestId('vaccine-indication-vaccine-select-0')
    await waitFor(() => expect(within(select).getByText('Hepatite B')).toBeInTheDocument())

    await userEvent.selectOptions(select, 'v1')
    await userEvent.type(screen.getByTestId('vaccine-indication-dose-input-0'), '1ª dose')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        items: [{ vaccineId: 'v1', doseLabel: '1ª dose' }],
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('vaccine-indication-form-modal')).not.toBeInTheDocument()
    })
  })

  it('traduz o 422 do backend em mensagem que o profissional entende', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockRejectedValue({ status: 422 })
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-form-error')).toHaveTextContent('consulta cancelada')
    })
  })

  it('traduz o 403 do backend', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockRejectedValue({ status: 403 })
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-form-error')).toHaveTextContent('não tem permissão')
    })
  })

  it('mostra mensagem genérica para erro inesperado', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockRejectedValue({ status: 500 })
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-form-error')).toHaveTextContent('Ocorreu um erro')
    })
  })

  // Emitir documento em branco não é erro de servidor: é erro que a tela pega.
  it('recusa emitir sem vacina selecionada, antes de chamar a API', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.click(await screen.findByTestId('vaccine-indication-submit'))

    expect(screen.getByTestId('vaccine-indication-form-validation-error')).toHaveTextContent(
      'Selecione ao menos uma vacina',
    )
    expect(mockService.create).not.toHaveBeenCalled()
  })

  it('permite indicar mais de uma vacina no mesmo documento', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockResolvedValue(makeDto() as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.click(screen.getByTestId('vaccine-indication-add-item'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-1'), 'v2')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        items: [{ vaccineId: 'v1' }, { vaccineId: 'v2' }],
      })
    })
  })

  it('remove uma vacina adicionada por engano', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.click(await screen.findByTestId('vaccine-indication-add-item'))
    expect(screen.getByTestId('vaccine-indication-vaccine-select-1')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('vaccine-indication-remove-item-1'))
    expect(screen.queryByTestId('vaccine-indication-vaccine-select-1')).not.toBeInTheDocument()
  })

  it('ignora item deixado em branco ao emitir', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockResolvedValue(makeDto() as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.click(screen.getByTestId('vaccine-indication-add-item'))
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        items: [{ vaccineId: 'v1' }],
      })
    })
  })

  it('baixa o PDF da indicação', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    mockService.downloadPdf.mockResolvedValue(new Blob(['%PDF']))
    const anchor = { href: '', download: '', click: jest.fn() } as unknown as HTMLAnchorElement
    // Só a âncora do download é interceptada: trocar createElement inteiro
    // impede o próprio testing-library de montar o container.
    const realCreateElement = document.createElement.bind(document)
    jest
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, ...rest: unknown[]) =>
        tag === 'a' ? anchor : realCreateElement(tag, ...(rest as [])),
      )
    Object.defineProperty(globalThis, 'URL', {
      value: { createObjectURL: jest.fn(() => 'blob:x'), revokeObjectURL: jest.fn() },
      writable: true,
    })

    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-download-button-indication-uuid'))

    await waitFor(() => expect(mockService.downloadPdf).toHaveBeenCalledWith('indication-uuid'))
    jest.restoreAllMocks()
  })

  it('exclui a indicação depois de confirmar no diálogo', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    mockService.remove.mockResolvedValue(undefined)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-delete-button-indication-uuid'))
    expect(screen.getByTestId('vaccine-indication-delete-dialog-message')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('vaccine-indication-delete-dialog-confirm'))

    await waitFor(() => expect(mockService.remove).toHaveBeenCalledWith('indication-uuid'))
  })

  it('cancela a exclusão sem chamar a API', async () => {
    mockService.getByAppointment.mockResolvedValue([makeDto()] as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-delete-button-indication-uuid'))
    await userEvent.click(screen.getByTestId('vaccine-indication-delete-dialog-cancel'))

    expect(mockService.remove).not.toHaveBeenCalled()
  })

  // Só o botão da indicação que está baixando entra em carregamento — com duas
  // na lista, o feedback no documento errado leva a clicar de novo.
  it('mostra carregamento apenas no documento que está sendo baixado', async () => {
    mockService.getByAppointment.mockResolvedValue([
      makeDto(),
      makeDto({ id: 'outra-uuid' }),
    ] as any)
    mockService.downloadPdf.mockReturnValue(new Promise(() => {}))
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-download-button-indication-uuid'))

    await waitFor(() => {
      expect(screen.getByTestId('vaccine-indication-download-button-indication-uuid')).toBeDisabled()
    })
    expect(screen.getByTestId('vaccine-indication-download-button-outra-uuid')).not.toBeDisabled()
  })

  it('leva orientação e observações até a API', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockService.create.mockResolvedValue(makeDto() as any)
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await userEvent.selectOptions(await screen.findByTestId('vaccine-indication-vaccine-select-0'), 'v1')
    await userEvent.type(screen.getByTestId('vaccine-indication-instructions-input-0'), 'Aplicar hoje')
    await userEvent.type(screen.getByTestId('vaccine-indication-notes-input'), 'Retorno em 30 dias.')
    await userEvent.click(screen.getByTestId('vaccine-indication-submit'))

    await waitFor(() => {
      expect(mockService.create).toHaveBeenCalledWith({
        appointmentId: APPOINTMENT_ID,
        items: [{ vaccineId: 'v1', instructions: 'Aplicar hoje' }],
        notes: 'Retorno em 30 dias.',
      })
    })
  })

  it('fecha o formulário sem emitir', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    expect(screen.getByTestId('vaccine-indication-form')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByTestId('vaccine-indication-form')).not.toBeInTheDocument()
    })
    expect(mockService.create).not.toHaveBeenCalled()
  })

  // O select pede uma página inteira do catálogo, e o teto do PaginationDto é
  // 100: pedir mais devolve 400 e o profissional vê um seletor vazio, sem erro.
  it('pede o catálogo dentro do limite que a API aceita', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))

    await waitFor(() => expect(mockVaccinesService.getAll).toHaveBeenCalled())
    const params = mockVaccinesService.getAll.mock.calls[0][0]
    expect(params?.limit).toBeLessThanOrEqual(100)
  })

  // Esconder vacina sem avisar é pior do que a lista incompleta.
  it('avisa quando o catálogo não cabe numa página', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    mockVaccinesService.getAll.mockResolvedValue({
      data: [{ id: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: null, isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }],
      total: 140,
      page: 1,
      limit: 100,
    } as any)

    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))

    expect(await screen.findByTestId('vaccine-indication-catalog-truncated')).toHaveTextContent(
      'primeiras 1 de 140',
    )
  })

  it('não avisa nada quando o catálogo inteiro coube', async () => {
    mockService.getByAppointment.mockResolvedValue([])
    renderWithProviders(
      <VaccineIndicationSection appointmentId={APPOINTMENT_ID} canManage canIssue />,
    )

    await userEvent.click(await screen.findByTestId('vaccine-indication-new-button'))
    await screen.findByTestId('vaccine-indication-vaccine-select-0')
    expect(screen.queryByTestId('vaccine-indication-catalog-truncated')).not.toBeInTheDocument()
  })
})
