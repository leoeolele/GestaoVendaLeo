import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/AppShell'
import { formatCurrencyVisibility, formatDateTime, getStatusLabel } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { usePrivacy } from '../contexts/usePrivacy'
import './ListaVendas.css'

type ListaVendasProps = {
  onEditarVenda: (vendaId: string) => void
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onNovaVenda: () => void
  onOpenMenu: () => void
  onRefreshData: () => void
  refreshToken: number
}

type VendaResumo = {
  id: string
  data_venda: string
  status: string
  forma_pagamento: string | null
  valor_total: number | null
  valor_pago: number | null
  valor_pendente: number | null
  pessoa: {
    nome: string
  } | null
  itens: Array<{
    produto_id?: string
    quantidade: number
    produto: {
      nome: string
      unidade: string
    } | null
  }>
}

type FiltroVenda = 'todas' | 'pendentes' | 'pagas' | 'canceladas'

async function buscarVendas() {
  const { data, error } = await supabase
    .from('vendas')
    .select(`
      id,
      data_venda,
      status,
      forma_pagamento,
      valor_total,
      valor_pago,
      valor_pendente,
      pessoa:pessoas (
        nome
      ),
      itens:vendas_itens (
        produto_id,
        quantidade,
        produto:produtos (
          nome,
          unidade
        )
      )
    `)
    .order('data_venda', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return (data ?? []) as unknown as VendaResumo[]
}

export function ListaVendas({
  onEditarVenda,
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onNovaVenda,
  onOpenMenu,
  onRefreshData,
  refreshToken,
}: ListaVendasProps) {
  const { valuesHidden } = usePrivacy()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroVenda>('todas')
  const [vendas, setVendas] = useState<VendaResumo[]>([])

  useEffect(() => {
    let ativo = true

    async function carregarVendas() {
      setCarregando(true)
      setErro(null)

      try {
        const data = await buscarVendas()

        if (!ativo) {
          return
        }

        setVendas(data)
      } catch (error) {
        if (!ativo) {
          return
        }

        setErro(getSupabaseErrorMessage(error, 'Erro ao carregar vendas.'))
      } finally {
        if (ativo) {
          setCarregando(false)
        }
      }
    }

    void carregarVendas()

    return () => {
      ativo = false
    }
  }, [refreshToken])

  const vendasFiltradas = vendas.filter((venda) => {
    const status = venda.status.toLowerCase()
    const pendente = Number(venda.valor_pendente || 0) > 0

    if (filtro === 'pendentes') {
      return status !== 'cancelada' && pendente
    }

    if (filtro === 'pagas') {
      return status !== 'cancelada' && !pendente
    }

    if (filtro === 'canceladas') {
      return status === 'cancelada'
    }

    return true
  })

  async function excluirVenda(venda: VendaResumo) {
    const confirmar = window.confirm(
      'Deseja excluir esta venda? Os itens serão removidos e o estoque vinculado será devolvido.',
    )

    if (!confirmar) {
      return
    }

    setErro(null)
    setExcluindoId(venda.id)

    try {
      const { data: itensVenda, error: itensError } = await supabase
        .from('vendas_itens')
        .select(`
          produto_id,
          quantidade,
          produto:produtos (
            estoque_atual,
            controla_estoque
          )
        `)
        .eq('venda_id', venda.id)

      if (itensError) {
        throw itensError
      }

      for (const item of (itensVenda ?? []) as unknown as Array<{
        produto_id: string
        quantidade: number
        produto: Array<{ estoque_atual: number | null; controla_estoque: boolean | null }> | null
      }>) {
        const produtoInfo = Array.isArray(item.produto) ? item.produto[0] : null

        if (!item.produto_id || !produtoInfo?.controla_estoque) {
          continue
        }

        const estoqueAtual = Number(produtoInfo.estoque_atual || 0)
        const estoqueFinal = estoqueAtual + Number(item.quantidade || 0)

        const { error: updateError } = await supabase
          .from('produtos')
          .update({ estoque_atual: estoqueFinal })
          .eq('id', item.produto_id)

        if (updateError) {
          throw updateError
        }
      }

      const { error: movimentosError } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('venda_id', venda.id)

      if (movimentosError) {
        throw movimentosError
      }

      const { error: deleteItensError } = await supabase
        .from('vendas_itens')
        .delete()
        .eq('venda_id', venda.id)

      if (deleteItensError) {
        throw deleteItensError
      }

      const { error: deleteVendaError } = await supabase
        .from('vendas')
        .delete()
        .eq('id', venda.id)

      if (deleteVendaError) {
        throw deleteVendaError
      }

      const data = await buscarVendas()
      setVendas(data)
      onRefreshData()
    } catch (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao excluir venda.'))
    } finally {
      setExcluindoId(null)
      setCarregando(false)
    }
  }

  return (
    <AppShell
      activeNav="vendas"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={() => undefined}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Lista de Vendas</h1>
            <p className="page-subtitle">Acompanhe entregas, recebimentos e histórico das vendas.</p>
          </div>
        </section>

        <section className="section-card">
          <div className="chip-row">
            <FilterChip label="Todas" active={filtro === 'todas'} onClick={() => setFiltro('todas')} />
            <FilterChip label="Pendentes" active={filtro === 'pendentes'} onClick={() => setFiltro('pendentes')} />
            <FilterChip label="Pagas" active={filtro === 'pagas'} onClick={() => setFiltro('pagas')} />
            <FilterChip label="Canceladas" active={filtro === 'canceladas'} onClick={() => setFiltro('canceladas')} />
          </div>
        </section>

        {erro && <div className="page-error">Não foi possível carregar as vendas: {erro}</div>}

        <section className="section-card">
          <div className="section-title-row">
            <h2>Vendas recentes</h2>
            <button type="button" className="section-link" onClick={onNovaVenda}>
              Nova venda
            </button>
          </div>

          {carregando && <div className="empty-state">Carregando vendas...</div>}

          {!carregando && vendasFiltradas.length === 0 && (
            <div className="empty-state">Nenhuma venda encontrada nesse filtro.</div>
          )}

          {!carregando && vendasFiltradas.length > 0 && (
            <div className="list-stack">
              {vendasFiltradas.map((venda) => {
                const statusBadgeClass = getVendaBadgeClass(venda)
                const descricao = (venda.itens ?? [])
                  .map(
                    (item) =>
                      `${Number(item.quantidade)} ${item.produto?.unidade ?? 'un'} ${item.produto?.nome ?? 'Produto'}`,
                  )
                  .join(', ')

                return (
                  <article
                    key={venda.id}
                    className="list-card sale-clickable-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => onEditarVenda(venda.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onEditarVenda(venda.id)
                      }
                    }}
                  >
                    <div className="list-card-top">
                      <div>
                        <span className="sale-date">{formatDateTime(venda.data_venda)}</span>
                        <p className="list-card-title">{venda.pessoa?.nome ?? 'Cliente não informado'}</p>
                      </div>

                      <span className={statusBadgeClass}>{getStatusLabel(venda.status)}</span>
                    </div>

                    <div className="sale-meta-row">
                      <span className="badge soft">{getFormaPagamentoLabel(venda.forma_pagamento)}</span>
                      <strong>{formatCurrencyVisibility(Number(venda.valor_total) || 0, valuesHidden)}</strong>
                    </div>

                    <p className="list-card-subtitle">{descricao || 'Sem itens informados.'}</p>

                    <div className="sale-values-row">
                      <div>
                        <span>Pago</span>
                        <strong>{formatCurrencyVisibility(Number(venda.valor_pago) || 0, valuesHidden)}</strong>
                      </div>

                      <div className="sale-pending-box">
                        <span>Saldo</span>
                        <strong>{formatCurrencyVisibility(Number(venda.valor_pendente) || 0, valuesHidden)}</strong>
                      </div>
                    </div>

                    <div className="sale-card-actions">
                      <button
                        type="button"
                        className="danger-button sale-delete-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void excluirVenda(venda)
                        }}
                        disabled={excluindoId === venda.id}
                      >
                        <Trash2 size={14} />
                        <span>{excluindoId === venda.id ? 'Excluindo...' : 'Excluir venda'}</span>
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <button type="button" className="floating-add" onClick={onNovaVenda} aria-label="Nova venda">
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

function getVendaBadgeClass(venda: VendaResumo) {
  const status = venda.status.toLowerCase()

  if (status === 'cancelada') {
    return 'badge danger'
  }

  if (Number(venda.valor_pendente || 0) > 0) {
    return 'badge warning'
  }

  return 'badge success'
}

function getFormaPagamentoLabel(formaPagamento: string | null) {
  if (!formaPagamento) {
    return 'Sem forma'
  }

  if (formaPagamento === 'cartao_credito') {
    return 'Cartão crédito'
  }

  if (formaPagamento === 'cartao_debito') {
    return 'Cartão débito'
  }

  return formaPagamento.replace('_', ' ')
}
