import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, SlidersHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Produto } from '../types/Produto'
import type { MovimentacaoEstoqueTipo } from '../types/MovimentacaoEstoque'
import { formatDateTime, formatQuantity } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { AppShell } from '../components/AppShell'
import './Estoque.css'

type EstoqueProps = {
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  refreshToken: number
  onRefreshData: () => void
}

type MovimentacaoConsulta = {
  id: string
  produto_id: string | null
  tipo: string
  quantidade: number
  motivo: string | null
  criado_em: string
  venda_id: string | null
  produto: {
    nome: string
    unidade: string
  } | null
}

const LOW_STOCK_THRESHOLD = 12

async function buscarEstoqueData() {
  const { data: produtosData, error: produtosError } = await supabase
    .from('produtos')
    .select('id, nome, descricao, preco, unidade, controla_estoque, estoque_atual, ativo, criado_em')
    .order('nome', { ascending: true })

  if (produtosError) {
    throw produtosError
  }

  const { data: movimentacoesData, error: movimentacoesError } = await supabase
    .from('movimentacoes_estoque')
    .select(`
      id,
      produto_id,
      tipo,
      quantidade,
      motivo,
      criado_em,
      venda_id,
      produto:produtos (
        nome,
        unidade
      )
    `)
    .order('criado_em', { ascending: false })
    .limit(30)

  if (movimentacoesError) {
    throw movimentacoesError
  }

  return {
    movimentacoes: (movimentacoesData ?? []) as unknown as MovimentacaoConsulta[],
    produtos: (produtosData ?? []) as Produto[],
  }
}

export function Estoque({
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  onRefreshData,
  refreshToken,
}: EstoqueProps) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [movimentoTipo, setMovimentoTipo] = useState<MovimentacaoEstoqueTipo>('entrada')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoConsulta[]>([])

  useEffect(() => {
    let ativo = true

    async function carregarEstoque() {
      setCarregando(true)
      setErro(null)

      try {
        const { movimentacoes: movimentacoesLista, produtos: produtosLista } = await buscarEstoqueData()

        if (!ativo) {
          return
        }

        setProdutos(produtosLista)
        setProdutoId((current) => current || produtosLista.find((produto) => produto.ativo)?.id || '')
        setMovimentacoes(movimentacoesLista)
      } catch (error) {
        if (!ativo) {
          return
        }

        setErro(getSupabaseErrorMessage(error, 'Erro ao carregar dados do estoque.'))
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    void carregarEstoque()

    return () => {
      ativo = false
    }
  }, [refreshToken])

  const produtosControlados = useMemo(
    () => produtos.filter((produto) => produto.ativo && produto.controla_estoque),
    [produtos],
  )

  const estoqueTotal = produtosControlados.reduce(
    (total, produto) => total + Number(produto.estoque_atual || 0),
    0,
  )

  const produtosBaixoEstoque = produtosControlados.filter(
    (produto) => Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD,
  )

  async function registrarMovimento(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!produtoId) {
      setErro('Selecione um produto.')
      return
    }

    const produto = produtos.find((item) => item.id === produtoId)
    const valorDigitado = Number(quantidade.replace(',', '.'))

    if (!produto) {
      setErro('Produto inválido.')
      return
    }

    if (!Number.isFinite(valorDigitado) || valorDigitado <= 0) {
      setErro(movimentoTipo === 'ajuste' ? 'Informe o novo estoque.' : 'Informe a quantidade.')
      return
    }

    const estoqueAtual = Number(produto.estoque_atual || 0)
    let estoqueFinal: number
    let quantidadeMovimento = valorDigitado

    if (movimentoTipo === 'entrada') {
      estoqueFinal = estoqueAtual + valorDigitado
    } else if (movimentoTipo === 'saida') {
      estoqueFinal = Math.max(0, estoqueAtual - valorDigitado)
      quantidadeMovimento = Math.min(valorDigitado, estoqueAtual)
    } else {
      estoqueFinal = valorDigitado
      quantidadeMovimento = valorDigitado - estoqueAtual
    }

    setSalvando(true)

    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: estoqueFinal })
      .eq('id', produtoId)

    if (updateError) {
      setErro(getSupabaseErrorMessage(updateError, 'Erro ao atualizar estoque do produto.'))
      setSalvando(false)
      return
    }

    const { error: movimentacaoError } = await supabase.from('movimentacoes_estoque').insert({
      criado_em: new Date().toISOString(),
      motivo: motivo.trim() || null,
      produto_id: produtoId,
      quantidade: quantidadeMovimento,
      tipo: movimentoTipo,
      venda_id: null,
    })

    if (movimentacaoError) {
      setErro(getSupabaseErrorMessage(movimentacaoError, 'Erro ao registrar movimentação de estoque.'))
      setSalvando(false)
      return
    }

    setQuantidade('')
    setMotivo('')
    setSalvando(false)
    onRefreshData()
  }

  async function excluirMovimentacao(movimentacao: MovimentacaoConsulta) {
    if (movimentacao.venda_id) {
      setErro('Essa movimentação foi gerada por uma venda. Exclua a venda para remover esse registro.')
      return
    }

    if (!movimentacao.produto_id) {
      setErro('Não foi possível identificar o produto dessa movimentação.')
      return
    }

    const confirmar = window.confirm(
      'Deseja excluir esta movimentação? O estoque do produto será recalculado automaticamente.',
    )

    if (!confirmar) {
      return
    }

    setErro(null)
    setExcluindoId(movimentacao.id)

    try {
      const { data: produtoData, error: produtoError } = await supabase
        .from('produtos')
        .select('estoque_atual')
        .eq('id', movimentacao.produto_id)
        .single()

      if (produtoError) {
        throw produtoError
      }

      const estoqueAtual = Number(produtoData.estoque_atual || 0)
      const deltaMovimento =
        movimentacao.tipo === 'saida'
          ? Number(movimentacao.quantidade || 0) * -1
          : Number(movimentacao.quantidade || 0)
      const estoqueRecalculado = estoqueAtual - deltaMovimento

      if (estoqueRecalculado < 0) {
        setErro('Não é possível excluir essa movimentação porque isso deixaria o estoque negativo.')
        return
      }

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ estoque_atual: estoqueRecalculado })
        .eq('id', movimentacao.produto_id)

      if (updateError) {
        throw updateError
      }

      const { error: deleteError } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('id', movimentacao.id)

      if (deleteError) {
        throw deleteError
      }

      const { movimentacoes: movimentacoesLista, produtos: produtosLista } = await buscarEstoqueData()
      setProdutos(produtosLista)
      setMovimentacoes(movimentacoesLista)
      onRefreshData()
    } catch (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao excluir movimentação de estoque.'))
    } finally {
      setExcluindoId(null)
      setCarregando(false)
    }
  }

  return (
    <AppShell
      activeNav="produtos"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Estoque</h1>
            <p className="page-subtitle">Controle entradas, saídas e ajustes sem sair do app.</p>
          </div>
        </section>

        {erro && <div className="page-error">{erro}</div>}

        <section className="metric-grid">
          <article className="metric-card">
            <span>Nível total em estoque</span>
            <strong>{formatQuantity(estoqueTotal, 'm3')}</strong>
          </article>

          <article className={produtosBaixoEstoque.length > 0 ? 'metric-card alert' : 'metric-card'}>
            <span>Produtos em alerta</span>
            <strong>{String(produtosBaixoEstoque.length).padStart(2, '0')}</strong>
          </article>
        </section>

        <form className="section-card form-stack" onSubmit={registrarMovimento}>
          <div className="section-title-row">
            <h2>Registrar movimento</h2>
          </div>

          <div className="inline-actions">
            <MovimentoButton active={movimentoTipo === 'entrada'} onClick={() => setMovimentoTipo('entrada')}>
              Entrada
            </MovimentoButton>
            <MovimentoButton active={movimentoTipo === 'saida'} onClick={() => setMovimentoTipo('saida')}>
              Saída
            </MovimentoButton>
            <MovimentoButton active={movimentoTipo === 'ajuste'} onClick={() => setMovimentoTipo('ajuste')}>
              Ajuste
            </MovimentoButton>
          </div>

          <div className="field-block">
            <label htmlFor="estoque-produto">Produto</label>
            <select
              id="estoque-produto"
              className="select-field"
              value={produtoId}
              onChange={(event) => setProdutoId(event.target.value)}
            >
              <option value="">Selecione um produto</option>
              {produtosControlados.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - {Number(produto.estoque_atual)} {produto.unidade}
                </option>
              ))}
            </select>
          </div>

          <div className="field-grid-two">
            <div className="field-block">
              <label htmlFor="estoque-quantidade">
                {movimentoTipo === 'ajuste' ? 'Novo estoque' : 'Quantidade'}
              </label>
              <input
                id="estoque-quantidade"
                className="text-field"
                type="number"
                min="0"
                step="0.01"
                value={quantidade}
                onChange={(event) => setQuantidade(event.target.value)}
                placeholder="0"
              />
            </div>

            <div className="field-block">
              <label htmlFor="estoque-motivo">Motivo</label>
              <input
                id="estoque-motivo"
                className="text-field"
                type="text"
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                placeholder="Ex: Compra do fornecedor"
              />
            </div>
          </div>

          <button type="submit" className="primary-button full-width" disabled={salvando}>
            {salvando ? 'Registrando...' : 'Salvar movimento'}
          </button>
        </form>

        <section className="section-card">
          <div className="section-title-row">
            <h2>Últimas movimentações</h2>
          </div>

          {carregando && <div className="empty-state">Carregando movimentações...</div>}

          {!carregando && movimentacoes.length === 0 && (
            <div className="empty-state">Nenhuma movimentação registrada ainda.</div>
          )}

          {!carregando && movimentacoes.length > 0 && (
            <div className="list-stack">
              {movimentacoes.map((movimentacao) => (
                <article key={movimentacao.id} className="list-card">
                  <div className="list-card-top">
                    <div className="movement-inline">
                      <span className={getMovementIconClass(movimentacao.tipo)}>{getMovementIcon(movimentacao.tipo)}</span>
                      <div>
                        <p className="list-card-title">{movimentacao.produto?.nome ?? 'Produto'}</p>
                        <p className="list-card-subtitle">
                          {formatDateTime(movimentacao.criado_em)}
                          {movimentacao.motivo ? ` • ${movimentacao.motivo}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="movement-actions">
                      <strong className={getMovementValueClass(movimentacao.tipo)}>
                        {Number(movimentacao.quantidade) > 0 ? '+' : ''}
                        {formatQuantity(Number(movimentacao.quantidade), movimentacao.produto?.unidade ?? 'un')}
                      </strong>

                      <button
                        type="button"
                        className="icon-button movement-delete-button"
                        onClick={() => excluirMovimentacao(movimentacao)}
                        aria-label="Excluir movimentação"
                        title="Excluir movimentação"
                        disabled={excluindoId === movimentacao.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-title-row">
            <h2>Níveis por produto</h2>
          </div>

          {carregando && <div className="empty-state">Carregando produtos...</div>}

          {!carregando && produtosControlados.length === 0 && (
            <div className="empty-state">Nenhum produto com controle de estoque cadastrado.</div>
          )}

          {!carregando && produtosControlados.length > 0 && (
            <div className="list-stack">
              {produtosControlados.map((produto) => (
                <article key={produto.id} className="list-card">
                  <div className="list-card-top">
                    <div>
                      <p className="list-card-title">{produto.nome}</p>
                      <p className="list-card-subtitle">{produto.descricao || 'Controle de estoque ativo'}</p>
                    </div>

                    <span
                      className={
                        Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD ? 'badge danger' : 'badge success'
                      }
                    >
                      {Number(produto.estoque_atual)} {produto.unidade}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function MovimentoButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={active ? 'secondary-button movement-button active' : 'secondary-button movement-button'}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function getMovementIcon(tipo: string) {
  if (tipo === 'entrada') {
    return <ArrowDown size={16} />
  }

  if (tipo === 'saida') {
    return <ArrowUp size={16} />
  }

  return <SlidersHorizontal size={16} />
}

function getMovementIconClass(tipo: string) {
  if (tipo === 'entrada') {
    return 'movement-icon success'
  }

  if (tipo === 'saida') {
    return 'movement-icon danger'
  }

  return 'movement-icon soft'
}

function getMovementValueClass(tipo: string) {
  if (tipo === 'entrada') {
    return 'movement-value success'
  }

  if (tipo === 'saida') {
    return 'movement-value danger'
  }

  return 'movement-value'
}
