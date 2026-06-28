import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { AlertTriangle, ChartNoAxesCombined, CircleDollarSign, Package2, ShoppingCart, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatCurrencyVisibility, getStatusLabel, startOfTodayIso } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { AppShell } from '../components/AppShell'
import { usePrivacy } from '../contexts/usePrivacy'
import './Menu.css'

type MenuProps = {
  onGoDashboardCompleto: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onNovaVenda: () => void
  onOpenMenu: () => void
  refreshToken: number
}

type VendaConsulta = {
  id: string
  status: string
  valor_total: number | null
  data_venda: string
  pessoa: {
    nome: string
  } | null
  itens: Array<{
    quantidade: number
    produto: {
      nome: string
      unidade: string
    } | null
  }>
}

type ProdutoBaixoEstoque = {
  id: string
  nome: string
  estoque_atual: number
  unidade: string
}

type EntregaResumoCard = {
  id: string
  cliente: string
  descricao: string
  status: string
}

const LOW_STOCK_THRESHOLD = 12

export function Menu({
  onGoDashboardCompleto,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onNovaVenda,
  onOpenMenu,
  refreshToken,
}: MenuProps) {
  const { valuesHidden } = usePrivacy()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [vendas, setVendas] = useState<VendaConsulta[]>([])
  const [produtoBaixoEstoque, setProdutoBaixoEstoque] = useState<ProdutoBaixoEstoque | null>(null)

  useEffect(() => {
    async function carregarResumo() {
      setCarregando(true)
      setErro(null)

      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select(`
          id,
          status,
          valor_total,
          data_venda,
          pessoa:pessoas (
            nome
          ),
          itens:vendas_itens (
            quantidade,
            produto:produtos (
              nome,
              unidade
            )
          )
        `)
        .order('data_venda', { ascending: false })
        .limit(30)

      if (vendasError) {
        setErro(getSupabaseErrorMessage(vendasError, 'Erro ao carregar vendas.'))
        setCarregando(false)
        return
      }

      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, estoque_atual, unidade')
        .eq('ativo', true)
        .eq('controla_estoque', true)
        .order('estoque_atual', { ascending: true })
        .limit(1)

      if (produtosError) {
        setErro(getSupabaseErrorMessage(produtosError, 'Erro ao carregar produtos.'))
        setCarregando(false)
        return
      }

      setVendas((vendasData ?? []) as unknown as VendaConsulta[])
      setProdutoBaixoEstoque((produtosData?.[0] as ProdutoBaixoEstoque | undefined) ?? null)
      setCarregando(false)
    }

    carregarResumo()
  }, [refreshToken])

  const resumo = useMemo(() => {
    const inicioHoje = startOfTodayIso()
    const vendasHoje = vendas.filter((venda) => venda.data_venda >= inicioHoje)
    const entregasPendentes = vendas.filter((venda) => {
      const status = venda.status.toLowerCase()
      return status !== 'entregue' && status !== 'cancelada' && status !== 'finalizada'
    })
    const ultimasEntregas = vendas.filter((venda) => {
      const status = venda.status.toLowerCase()
      return status === 'entregue' || status === 'finalizada'
    })

    return {
      entregasPendentes: entregasPendentes.slice(0, 4).map(mapearEntrega),
      pendentes: entregasPendentes.length,
      ultimasEntregas: ultimasEntregas.slice(0, 4).map(mapearEntrega),
      valorTotal: vendasHoje.reduce((total, venda) => total + Number(venda.valor_total || 0), 0),
      vendasDoDia: vendasHoje.length,
    }
  }, [vendas])

  const nomeEstoqueBaixo =
    produtoBaixoEstoque && Number(produtoBaixoEstoque.estoque_atual) <= LOW_STOCK_THRESHOLD
      ? produtoBaixoEstoque.nome
      : '-'

  return (
    <AppShell
      activeNav="menu"
      onGoMenu={() => undefined}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Olá, Gerente</h1>
            <p className="page-subtitle">Aqui está o resumo da sua operação de hoje.</p>
          </div>
        </section>

        <button type="button" className="primary-button full-width dashboard-sale-button" onClick={onNovaVenda}>
          <ShoppingCart size={18} />
          <span>Nova Venda</span>
        </button>

        <button type="button" className="secondary-button full-width dashboard-manager-button" onClick={onGoDashboardCompleto}>
          <ChartNoAxesCombined size={18} />
          <span>Dashboard completo</span>
        </button>

        {erro && <div className="page-error">Não foi possível carregar o painel: {erro}</div>}

        <section className="metric-grid dashboard-metric-grid">
          <MetricCard icon={<ShoppingCart size={18} />} title="Vendas do dia" value={String(resumo.vendasDoDia)} />
          <MetricCard
            icon={<CircleDollarSign size={18} />}
            title="Valor total"
            value={formatCurrencyVisibility(resumo.valorTotal, valuesHidden)}
          />
          <MetricCard icon={<Truck size={18} />} title="Pendentes" value={String(resumo.pendentes).padStart(2, '0')} />
          <MetricCard alert icon={<AlertTriangle size={18} />} title="Estoque baixo" value={nomeEstoqueBaixo} />
        </section>

        <section className="section-card">
          <div className="section-title-row">
            <h2>Entregas pendentes</h2>
            <button type="button" className="section-link" onClick={onGoVendas}>
              Ver tudo
            </button>
          </div>

          {carregando && <div className="empty-state">Carregando entregas...</div>}

          {!carregando && resumo.entregasPendentes.length === 0 && (
            <div className="empty-state">Nenhuma entrega pendente no momento.</div>
          )}

          {!carregando && resumo.entregasPendentes.length > 0 && (
            <div className="list-stack">
              {resumo.entregasPendentes.map((entrega) => (
                <DeliveryCard key={entrega.id} entrega={entrega} />
              ))}
            </div>
          )}
        </section>

        <section className="section-card">
          <div className="section-title-row">
            <h2>Últimas entregas</h2>
            <button type="button" className="section-link" onClick={onGoVendas}>
              Ver tudo
            </button>
          </div>

          {carregando && <div className="empty-state">Carregando entregas...</div>}

          {!carregando && resumo.ultimasEntregas.length === 0 && (
            <div className="empty-state">Ainda não há vendas entregues.</div>
          )}

          {!carregando && resumo.ultimasEntregas.length > 0 && (
            <div className="list-stack">
              {resumo.ultimasEntregas.map((entrega) => (
                <DeliveryCard key={entrega.id} entrega={entrega} entregue />
              ))}
            </div>
          )}
        </section>

        <section className="section-card compact-stock-card">
          <div className="section-title-row">
            <h2>Produto em alerta</h2>
            <button type="button" className="section-link" onClick={onGoProdutos}>
              Abrir produtos
            </button>
          </div>

          {produtoBaixoEstoque ? (
            <div className="split-values">
              <div className="stock-inline">
                <Package2 size={18} />
                <div>
                  <strong>{produtoBaixoEstoque.nome}</strong>
                  <span>
                    {Number(produtoBaixoEstoque.estoque_atual)} {produtoBaixoEstoque.unidade} disponíveis
                  </span>
                </div>
              </div>

              <span
                className={
                  Number(produtoBaixoEstoque.estoque_atual) <= LOW_STOCK_THRESHOLD
                    ? 'badge danger'
                    : 'badge success'
                }
              >
                {Number(produtoBaixoEstoque.estoque_atual) <= LOW_STOCK_THRESHOLD ? 'Baixo' : 'Em estoque'}
              </span>
            </div>
          ) : (
            <div className="empty-state">Cadastre produtos para acompanhar o estoque aqui.</div>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function mapearEntrega(venda: VendaConsulta): EntregaResumoCard {
  const descricao = (venda.itens ?? [])
    .map((item) => `${Number(item.quantidade)} ${item.produto?.unidade ?? 'un'} ${item.produto?.nome ?? 'Produto'}`)
    .join(', ')

  return {
    id: venda.id,
    cliente: venda.pessoa?.nome ?? 'Cliente não informado',
    descricao: descricao || 'Sem itens cadastrados',
    status: getStatusLabel(venda.status),
  }
}

type MetricCardProps = {
  alert?: boolean
  icon: ReactElement
  title: string
  value: string
}

function MetricCard({ alert, icon, title, value }: MetricCardProps) {
  return (
    <article className={alert ? 'metric-card alert' : 'metric-card'}>
      <div className="menu-metric-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  )
}

function DeliveryCard({
  entrega,
  entregue = false,
}: {
  entrega: EntregaResumoCard
  entregue?: boolean
}) {
  return (
    <article className="list-card delivery-card">
      <div className="list-card-top">
        <div>
          <p className="list-card-title">{entrega.cliente}</p>
          <p className="list-card-subtitle">{entrega.descricao}</p>
        </div>

        <span className={entregue ? 'badge success' : 'badge soft'}>{entrega.status}</span>
      </div>
    </article>
  )
}
