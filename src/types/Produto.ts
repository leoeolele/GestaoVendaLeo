export type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  unidade: string
  controla_estoque: boolean
  estoque_atual: number
  ativo: boolean
  criado_em: string
}

export type NovoProduto = {
  nome: string
  descricao?: string | null
  preco?: number
  unidade?: string
  controla_estoque?: boolean
  estoque_atual?: number
  ativo?: boolean
}

export type ProdutoAtualizacao = Partial<NovoProduto>