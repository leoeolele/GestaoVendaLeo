import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { normalizeLabel } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { AppShell } from '../components/AppShell'
import './Pessoas.css'

type PessoasProps = {
  onAdicionarPessoa: () => void
  onEditarPessoa: (pessoaId: string) => void
  onGoMenu: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  refreshToken: number
}

type PessoaConsulta = {
  id: string
  nome: string
  telefone: string | null
  endereco: string | null
  observacao: string | null
  ativo: boolean
  tipo: {
    nome: string
  } | null
}

type FiltroPessoa = 'tudo' | 'clientes' | 'fornecedores' | 'funcionarios'

export function Pessoas({
  onAdicionarPessoa,
  onEditarPessoa,
  onGoMenu,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  refreshToken,
}: PessoasProps) {
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroPessoa>('tudo')
  const [pessoas, setPessoas] = useState<PessoaConsulta[]>([])

  useEffect(() => {
    async function carregarPessoas() {
      setCarregando(true)
      setErro(null)

      const { data, error } = await supabase
        .from('pessoas')
        .select(`
          id,
          nome,
          telefone,
          endereco,
          observacao,
          ativo,
          tipo:pessoas_tipos (
            nome
          )
        `)
        .order('nome', { ascending: true })

      if (error) {
        setErro(getSupabaseErrorMessage(error, 'Erro ao carregar pessoas.'))
        setCarregando(false)
        return
      }

      setPessoas((data ?? []) as unknown as PessoaConsulta[])
      setCarregando(false)
    }

    void carregarPessoas()
  }, [refreshToken])

  const pessoasFiltradas = useMemo(() => {
    const termo = normalizeLabel(busca)

    return pessoas.filter((pessoa) => {
      const tipoNome = normalizeLabel(pessoa.tipo?.nome ?? '')
      const textoBase = normalizeLabel(
        [pessoa.nome, pessoa.telefone ?? '', pessoa.endereco ?? '', pessoa.observacao ?? ''].join(' '),
      )

      if (termo && !textoBase.includes(termo)) {
        return false
      }

      if (filtro === 'clientes') {
        return tipoNome.includes('cliente')
      }

      if (filtro === 'fornecedores') {
        return tipoNome.includes('fornecedor')
      }

      if (filtro === 'funcionarios') {
        return tipoNome.includes('funcionario')
      }

      return true
    })
  }, [busca, filtro, pessoas])

  return (
    <AppShell
      activeNav="pessoas"
      onGoMenu={onGoMenu}
      onGoPessoas={() => undefined}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Pessoas</h1>
            <p className="page-subtitle">Gerencie clientes, fornecedores e equipe em um só lugar.</p>
          </div>
        </section>

        <section className="section-card">
          <div className="search-row">
            <Search size={18} />
            <input
              className="search-field people-search-field"
              type="text"
              placeholder="Buscar por nome, telefone ou endereço..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <div className="chip-row people-chip-row">
            <FilterChip label="Tudo" active={filtro === 'tudo'} onClick={() => setFiltro('tudo')} />
            <FilterChip label="Clientes" active={filtro === 'clientes'} onClick={() => setFiltro('clientes')} />
            <FilterChip
              label="Fornecedores"
              active={filtro === 'fornecedores'}
              onClick={() => setFiltro('fornecedores')}
            />
            <FilterChip
              label="Funcionários"
              active={filtro === 'funcionarios'}
              onClick={() => setFiltro('funcionarios')}
            />
          </div>
        </section>

        {erro && <div className="page-error">Não foi possível carregar as pessoas: {erro}</div>}

        <section className="section-card">
          <div className="section-title-row">
            <h2>Cadastros</h2>
          </div>

          {carregando && <div className="empty-state">Carregando pessoas...</div>}

          {!carregando && pessoasFiltradas.length === 0 && (
            <div className="empty-state">Nenhum cadastro encontrado com esse filtro.</div>
          )}

          {!carregando && pessoasFiltradas.length > 0 && (
            <div className="list-stack">
              {pessoasFiltradas.map((pessoa) => (
                <button
                  key={pessoa.id}
                  type="button"
                  className="list-card-button person-card"
                  onClick={() => onEditarPessoa(pessoa.id)}
                >
                  <div className="list-card-top">
                    <div>
                      <p className="list-card-title">{pessoa.nome}</p>
                      <p className="list-card-subtitle">
                        {pessoa.telefone || 'Sem telefone'} {pessoa.endereco ? `• ${pessoa.endereco}` : ''}
                      </p>
                    </div>

                    <span className={pessoa.ativo ? 'badge soft' : 'badge danger'}>
                      {pessoa.tipo?.nome ?? 'Sem tipo'}
                    </span>
                  </div>

                  {pessoa.observacao && <p className="person-note">{pessoa.observacao}</p>}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <button type="button" className="floating-add" onClick={onAdicionarPessoa} aria-label="Adicionar pessoa">
        <Plus size={22} />
      </button>
    </AppShell>
  )
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button type="button" className={active ? 'chip active' : 'chip'} onClick={onClick}>
      {label}
    </button>
  )
}
