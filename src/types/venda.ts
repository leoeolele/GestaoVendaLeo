export type VendaStatus = 'aberta' | 'pendente' | 'entregue' | 'cancelada' | 'finalizada'

export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'fiado'
  | 'outro'

export type Venda = {
  id: string
  pessoa_id: string | null
  data_venda: string
  status: VendaStatus | string
  forma_pagamento: FormaPagamento | string | null
  valor_total: number
  valor_pago: number
  valor_pendente: number
  despesa_total: number
  desconto_total: number
  observacao: string | null
  criado_em: string
}

export type NovaVenda = {
  pessoa_id?: string | null
  data_venda?: string
  status?: VendaStatus | string
  forma_pagamento?: FormaPagamento | string | null
  valor_total?: number
  valor_pago?: number
  valor_pendente?: number
  despesa_total?: number
  desconto_total?: number
  observacao?: string | null
}

export type ResumoVendas = {
  vendasDoDia: number
  valorTotal: number
  pendentes: number
  estoqueBaixo: string
  entregasPendentes: number
}

export type VendaAtualizacao = Partial<NovaVenda>