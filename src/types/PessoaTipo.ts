export type PessoaTipoNome = 'Cliente' | 'Fornecedor' | 'Funcionário' | 'Outro'

export type PessoaTipo = {
  id: string
  nome: PessoaTipoNome | string
  criado_em: string
}

export type NovaPessoaTipo = {
  nome: PessoaTipoNome | string
}