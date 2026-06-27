export type Pessoa = {
  id: string
  tipo_id: string
  nome: string
  telefone: string | null
  endereco: string | null
  observacao: string | null
  ativo: boolean
  criado_em: string
}

export type NovaPessoa = {
  tipo_id: string
  nome: string
  telefone?: string | null
  endereco?: string | null
  observacao?: string | null
  ativo?: boolean
}

export type PessoaAtualizacao = Partial<NovaPessoa>