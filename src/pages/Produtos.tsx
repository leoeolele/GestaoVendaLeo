import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Produto } from '../types/Produto'
import { formatCurrencyVisibility } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { AppShell } from '../components/AppShell'
import { usePrivacy } from '../contexts/usePrivacy'
import './Produtos.css'

type ProdutosProps = {
  onAdicionarProduto: () => void
  onEditarProduto: (produtoId: string) => void
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  refreshToken: number
}

type FiltroProduto = 'todos' | 'estoque' | 'baixo' | 'inativos'

const LOW_STOCK_THRESHOLD = 12

export function Produtos({
  onAdicionarProduto,
  onEditarProduto,
  onGoMenu,
  onGoPessoas,
  onGoVendas,
  onOpenMenu,
  refreshToken,
}: ProdutosProps) {
  const { valuesHidden } = usePrivacy()
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroProduto>('todos')
  const [produtos, setProdutos] = useState<Produto[]>([])

  useEffect(() => {
    async function carregarProdutos() {
      setCarregando(true)
      setErro(null)

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, unidade, controla_estoque, estoque_atual, ativo, criado_em')
        .order('nome', { ascending: true })

      if (error) {
        setErro(getSupabaseErrorMessage(error, 'Erro ao carregar produtos.'))
        setCarregando(false)
        return
      }

      setProdutos((data ?? []) as Produto[])
      setCarregando(false)
    }

    carregarProdutos()
  }, [refreshToken])

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()

    return produtos.filter((produto) => {
      const nomeCombina =
        !termo ||
        produto.nome.toLowerCase().includes(termo) ||
        (produto.descricao ?? '').toLowerCase().includes(termo)

      if (!nomeCombina) {
        return false
      }

      if (filtro === 'estoque') {
        return produto.ativo && Number(produto.estoque_atual) > LOW_STOCK_THRESHOLD
      }

      if (filtro === 'baixo') {
        return produto.ativo && Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD
      }

      if (filtro === 'inativos') {
        return !produto.ativo
      }

      return true
    })
  }, [busca, filtro, produtos])

  return (
    <AppShell
      activeNav="produtos"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={() => undefined}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Produtos</h1>
            <p className="page-subtitle">Cadastre e acompanhe a linha de produtos vendida.</p>
          </div>
        </section>

        <section className="section-card">
          <div className="search-row">
            <Search size={18} />
            <input
              className="search-field products-search-field"
              type="text"
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
            />
          </div>

          <div className="chip-row">
            <FilterChip label="Todos" active={filtro === 'todos'} onClick={() => setFiltro('todos')} />
            <FilterChip label="Com estoque" active={filtro === 'estoque'} onClick={() => setFiltro('estoque')} />
            <FilterChip label="Baixo estoque" active={filtro === 'baixo'} onClick={() => setFiltro('baixo')} />
            <FilterChip label="Inativos" active={filtro === 'inativos'} onClick={() => setFiltro('inativos')} />
          </div>
        </section>

        {erro && <div className="page-error">Não foi possível carregar os produtos: {erro}</div>}

        <section className="section-card">
          <div className="section-title-row">
            <h2>Meus produtos</h2>
            <button type="button" className="section-link" onClick={onAdicionarProduto}>
              Novo cadastro
            </button>
          </div>

          {carregando && <div className="empty-state">Carregando produtos...</div>}

          {!carregando && produtosFiltrados.length === 0 && (
            <div className="empty-state">Nenhum produto encontrado para esse filtro.</div>
          )}

          {!carregando && produtosFiltrados.length > 0 && (
            <div className="list-stack">
              {produtosFiltrados.map((produto) => (
                <button
                  key={produto.id}
                  type="button"
                  className="list-card-button product-card"
                  onClick={() => onEditarProduto(produto.id)}
                >
                  <div className="list-card-top">
                    <div>
                      <p className="list-card-title">{produto.nome}</p>
                      <p className="list-card-subtitle">{produto.descricao || 'Sem descrição cadastrada.'}</p>
                    </div>

                    <span className={getProdutoBadgeClass(produto)}>
                      {getProdutoBadgeLabel(produto)}
                    </span>
                  </div>

                  <div className="split-values product-split">
                    <div>
                      <span>Preço</span>
                      <strong>
                        {formatCurrencyVisibility(Number(produto.preco) || 0, valuesHidden)} / {produto.unidade}
                      </strong>
                    </div>

                    <div className="product-stock-info">
                      <span>Disponível</span>
                      <strong>
                        {Number(produto.estoque_atual)} {produto.unidade}
                      </strong>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <button type="button" className="floating-add" onClick={onAdicionarProduto} aria-label="Adicionar produto">
        <Plus size={22} />
      </button>
    </AppShell>
  )
}

function getProdutoBadgeClass(produto: Produto) {
  if (!produto.ativo) {
    return 'badge soft'
  }

  if (Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD) {
    return 'badge danger'
  }

  return 'badge success'
}

function getProdutoBadgeLabel(produto: Produto) {
  if (!produto.ativo) {
    return 'Inativo'
  }

  if (Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD) {
    return 'Baixo'
  }

  return 'Em estoque'
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
