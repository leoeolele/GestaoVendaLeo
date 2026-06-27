export type MovimentacaoEstoqueTipo = 'entrada' | 'saida' | 'ajuste'

export type MovimentacaoEstoque = {
  id: string
  produto_id: string
  tipo: MovimentacaoEstoqueTipo | string
  quantidade: number
  motivo: string | null
  venda_id: string | null
  criado_em: string
}

export type NovaMovimentacaoEstoque = {
  produto_id: string
  tipo: MovimentacaoEstoqueTipo | string
  quantidade: number
  motivo?: string | null
  venda_id?: string | null
}