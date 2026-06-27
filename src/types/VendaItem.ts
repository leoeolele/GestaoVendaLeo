export type VendaItem = {
  id: string
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
  criado_em: string
}

export type NovoVendaItem = {
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

export type VendaItemAtualizacao = Partial<Omit<NovoVendaItem, 'venda_id'>>