export type Venda = {
  id: string
  cliente_nome: string
  produto_nome: string
  quantidade: number
  valor_total: number
  despesa_total: number
  desconto_total: number
  status_entrega: string
  created_at: string
  updated_at: string
}

export type ResumoVendas = {
  vendasDoDia: number
  valorTotal: number
  pendentes: number
  estoqueBaixo: string
  entregasPendentes: number
}