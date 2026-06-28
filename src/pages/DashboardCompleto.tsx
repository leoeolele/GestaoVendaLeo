import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BadgeDollarSign,
  Boxes,
  CalendarRange,
  CircleDollarSign,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/AppShell'
import { formatCurrency, formatCurrencyVisibility, formatQuantity, getStatusLabel } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { usePrivacy } from '../contexts/usePrivacy'
import './DashboardCompleto.css'

type DashboardCompletoProps = {
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  refreshToken: number
}

type VendaDashboard = {
  id: string
  data_venda: string
  despesa_total: number | null
  status: string
  valor_pago: number | null
  valor_pendente: number | null
  valor_total: number | null
  pessoa: {
    nome: string
  } | null
  itens: Array<{
    quantidade: number
    subtotal: number | null
    produto: {
      nome: string
      unidade: string
    } | null
  }>
}

type ProdutoEstoque = {
  id: string
  estoque_atual: number
  nome: string
  unidade: string
}

type TopLinha = {
  detalhe: string
  principal: string
  secundario: string
  valor: number
}

type StatusPizza = {
  color: string
  label: string
  value: number
}

const MONTH_OPTIONS = [
  { label: 'Ano inteiro', value: 'all' },
  { label: 'Janeiro', value: '0' },
  { label: 'Fevereiro', value: '1' },
  { label: 'Março', value: '2' },
  { label: 'Abril', value: '3' },
  { label: 'Maio', value: '4' },
  { label: 'Junho', value: '5' },
  { label: 'Julho', value: '6' },
  { label: 'Agosto', value: '7' },
  { label: 'Setembro', value: '8' },
  { label: 'Outubro', value: '9' },
  { label: 'Novembro', value: '10' },
  { label: 'Dezembro', value: '11' },
] as const

const MONTH_SHORT_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const STATUS_COLORS = ['#7a5647', '#e0a94a', '#2a8a57', '#b64d48', '#5d4037']
const LOW_STOCK_THRESHOLD = 12

export function DashboardCompleto({
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  refreshToken,
}: DashboardCompletoProps) {
  const { valuesHidden } = usePrivacy()
  const currentYear = new Date().getFullYear()
  const [anoSelecionado, setAnoSelecionado] = useState(String(currentYear))
  const [mesSelecionado, setMesSelecionado] = useState('all')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [produtosAlerta, setProdutosAlerta] = useState<ProdutoEstoque[]>([])
  const [vendas, setVendas] = useState<VendaDashboard[]>([])

  useEffect(() => {
    async function carregarDashboard() {
      setCarregando(true)
      setErro(null)

      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select(`
          id,
          data_venda,
          status,
          valor_total,
          valor_pago,
          valor_pendente,
          despesa_total,
          pessoa:pessoas (
            nome
          ),
          itens:vendas_itens (
            quantidade,
            subtotal,
            produto:produtos (
              nome,
              unidade
            )
          )
        `)
        .order('data_venda', { ascending: true })

      if (vendasError) {
        setErro(getSupabaseErrorMessage(vendasError, 'Erro ao carregar vendas do dashboard.'))
        setCarregando(false)
        return
      }

      const { data: produtosData, error: produtosError } = await supabase
        .from('produtos')
        .select('id, nome, estoque_atual, unidade')
        .eq('ativo', true)
        .eq('controla_estoque', true)
        .order('estoque_atual', { ascending: true })
        .limit(6)

      if (produtosError) {
        setErro(getSupabaseErrorMessage(produtosError, 'Erro ao carregar produtos em alerta.'))
        setCarregando(false)
        return
      }

      setVendas((vendasData ?? []) as unknown as VendaDashboard[])
      setProdutosAlerta((produtosData ?? []) as ProdutoEstoque[])
      setCarregando(false)
    }

    carregarDashboard()
  }, [refreshToken])

  const anosDisponiveis = useMemo(() => {
    const years = new Set<number>()

    for (const venda of vendas) {
      const year = new Date(venda.data_venda).getFullYear()
      if (!Number.isNaN(year)) {
        years.add(year)
      }
    }

    years.add(currentYear)
    return Array.from(years).sort((a, b) => b - a)
  }, [currentYear, vendas])

  const anoFiltro = anosDisponiveis.includes(Number(anoSelecionado))
    ? anoSelecionado
    : String(anosDisponiveis[0] ?? currentYear)

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((venda) => {
      const data = new Date(venda.data_venda)
      const sameYear = data.getFullYear() === Number(anoFiltro)
      const sameMonth = mesSelecionado === 'all' || data.getMonth() === Number(mesSelecionado)
      return sameYear && sameMonth
    })
  }, [anoFiltro, mesSelecionado, vendas])

  const resumo = useMemo(() => {
    const faturamento = vendasFiltradas.reduce((total, venda) => total + Number(venda.valor_total || 0), 0)
    const despesas = vendasFiltradas.reduce((total, venda) => total + Number(venda.despesa_total || 0), 0)
    const lucro = faturamento - despesas
    const saldoReceber = vendasFiltradas.reduce((total, venda) => total + Number(venda.valor_pendente || 0), 0)
    const valorPago = vendasFiltradas.reduce((total, venda) => total + Number(venda.valor_pago || 0), 0)
    const ticketMedio = vendasFiltradas.length > 0 ? faturamento / vendasFiltradas.length : 0
    const clientes = new Set(vendasFiltradas.map((venda) => venda.pessoa?.nome ?? 'Cliente não informado'))
    const entregasPendentes = vendasFiltradas.filter((venda) => {
      const status = venda.status.toLowerCase()
      return status !== 'entregue' && status !== 'finalizada' && status !== 'cancelada'
    }).length

    return {
      clientesAtendidos: clientes.size,
      despesas,
      entregasPendentes,
      faturamento,
      lucro,
      margem: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      saldoReceber,
      ticketMedio,
      valorPago,
    }
  }, [vendasFiltradas])

  const serieLucro = useMemo(() => {
    if (mesSelecionado === 'all') {
      const months = MONTH_SHORT_LABELS.map((label, index) => ({
        chave: index,
        label,
        lucro: 0,
        vendas: 0,
      }))

      for (const venda of vendasFiltradas) {
        const data = new Date(venda.data_venda)
        const month = data.getMonth()
        months[month].lucro += Number(venda.valor_total || 0) - Number(venda.despesa_total || 0)
        months[month].vendas += Number(venda.valor_total || 0)
      }

      return months
    }

    const year = Number(anoFiltro)
    const month = Number(mesSelecionado)
    const totalDias = new Date(year, month + 1, 0).getDate()
    const dias = Array.from({ length: totalDias }, (_, index) => ({
      chave: index + 1,
      label: String(index + 1).padStart(2, '0'),
      lucro: 0,
      vendas: 0,
    }))

    for (const venda of vendasFiltradas) {
      const data = new Date(venda.data_venda)
      const day = data.getDate() - 1
      dias[day].lucro += Number(venda.valor_total || 0) - Number(venda.despesa_total || 0)
      dias[day].vendas += Number(venda.valor_total || 0)
    }

    return dias
  }, [anoFiltro, mesSelecionado, vendasFiltradas])

  const topProdutos = useMemo<TopLinha[]>(() => {
    const mapa = new Map<string, { quantidade: number; receita: number; unidade: string }>()

    for (const venda of vendasFiltradas) {
      for (const item of venda.itens ?? []) {
        const nome = item.produto?.nome ?? 'Produto não identificado'
        const unidade = item.produto?.unidade ?? 'un'
        const atual = mapa.get(nome) ?? { quantidade: 0, receita: 0, unidade }

        atual.quantidade += Number(item.quantidade || 0)
        atual.receita += Number(item.subtotal || 0)
        mapa.set(nome, atual)
      }
    }

    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({
        detalhe: formatQuantity(dados.quantidade, dados.unidade),
        principal: nome,
        secundario: formatCurrency(dados.receita),
        valor: dados.receita,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }, [vendasFiltradas])

  const topClientes = useMemo<TopLinha[]>(() => {
    const mapa = new Map<string, { total: number; compras: number }>()

    for (const venda of vendasFiltradas) {
      const nome = venda.pessoa?.nome ?? 'Cliente não informado'
      const atual = mapa.get(nome) ?? { compras: 0, total: 0 }

      atual.compras += 1
      atual.total += Number(venda.valor_total || 0)
      mapa.set(nome, atual)
    }

    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({
        detalhe: `${dados.compras} venda${dados.compras > 1 ? 's' : ''}`,
        principal: nome,
        secundario: formatCurrency(dados.total),
        valor: dados.total,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
  }, [vendasFiltradas])

  const statusData = useMemo<StatusPizza[]>(() => {
    const counts = new Map<string, number>()

    for (const venda of vendasFiltradas) {
      const label = getStatusLabel(venda.status)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    }

    return Array.from(counts.entries()).map(([label, value], index) => ({
      color: STATUS_COLORS[index % STATUS_COLORS.length],
      label,
      value,
    }))
  }, [vendasFiltradas])

  const periodoLabel =
    mesSelecionado === 'all'
      ? `Ano de ${anoFiltro}`
      : `${MONTH_OPTIONS.find((option) => option.value === mesSelecionado)?.label ?? 'Mês'} de ${anoFiltro}`

  return (
    <AppShell
      activeNav="menu"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">Dashboard Gerencial</h1>
            <p className="page-subtitle">
              Acompanhe lucro, faturamento, clientes, produtos e alertas operacionais do negócio.
            </p>
          </div>
        </section>

        <section className="section-card dashboard-filter-card">
          <div className="dashboard-filter-grid">
            <div className="field-block">
              <label htmlFor="dashboard-ano">Ano</label>
              <select
                id="dashboard-ano"
                className="select-field"
                value={anoFiltro}
                onChange={(event) => setAnoSelecionado(event.target.value)}
              >
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={String(ano)}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <label htmlFor="dashboard-mes">Mês</label>
              <select
                id="dashboard-mes"
                className="select-field"
                value={mesSelecionado}
                onChange={(event) => setMesSelecionado(event.target.value)}
              >
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="dashboard-period-chip">
              <CalendarRange size={18} />
              <div>
                <strong>{periodoLabel}</strong>
                <span>
                  {mesSelecionado === 'all'
                    ? 'Comparativo mensal de faturamento e lucro'
                    : 'Comparativo diário de faturamento e lucro'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {erro && <div className="page-error">Não foi possível carregar o dashboard: {erro}</div>}

        <section className="dashboard-kpi-grid">
          <DashboardMetricCard
            icon={<CircleDollarSign size={18} />}
            label="Faturamento"
            value={formatCurrencyVisibility(resumo.faturamento, valuesHidden)}
            help="Total vendido no período"
          />
          <DashboardMetricCard
            icon={<BadgeDollarSign size={18} />}
            label="Lucro estimado"
            value={formatCurrencyVisibility(resumo.lucro, valuesHidden)}
            help={`${resumo.margem.toFixed(1)}% de margem`}
          />
          <DashboardMetricCard
            icon={<ShoppingBag size={18} />}
            label="Ticket médio"
            value={formatCurrencyVisibility(resumo.ticketMedio, valuesHidden)}
            help={`${vendasFiltradas.length} venda${vendasFiltradas.length === 1 ? '' : 's'} no período`}
          />
          <DashboardMetricCard
            icon={<Users size={18} />}
            label="Clientes atendidos"
            value={String(resumo.clientesAtendidos)}
            help="Clientes únicos no período"
          />
          <DashboardMetricCard
            icon={<Truck size={18} />}
            label="Entregas pendentes"
            value={String(resumo.entregasPendentes)}
            help="Vendas ainda não finalizadas"
          />
          <DashboardMetricCard
            icon={<AlertTriangle size={18} />}
            label="Saldo a receber"
            value={formatCurrencyVisibility(resumo.saldoReceber, valuesHidden)}
            help={`${formatCurrencyVisibility(resumo.valorPago, valuesHidden)} já recebido`}
            alert={resumo.saldoReceber > 0}
          />
        </section>

        <section className="dashboard-main-grid">
          <article className="section-card dashboard-chart-card">
            <div className="section-title-row">
              <h2>Lucro e faturamento</h2>
              <span className="badge soft">{periodoLabel}</span>
            </div>

            {carregando ? (
              <div className="empty-state">Carregando gráfico...</div>
            ) : serieLucro.every((item) => item.lucro === 0 && item.vendas === 0) ? (
              <div className="empty-state">Ainda não há vendas suficientes para gerar o gráfico.</div>
            ) : (
              <div className="chart-shell">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={serieLucro}>
                    <defs>
                      <linearGradient id="vendasGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b6453" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#8b6453" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="lucroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2a8a57" stopOpacity={0.34} />
                        <stop offset="95%" stopColor="#2a8a57" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(125, 96, 83, 0.16)" />
                    <XAxis dataKey="label" stroke="#7a6156" tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#7a6156"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => (valuesHidden ? 'R$ •••' : `R$ ${Math.round(Number(value) / 1000)}k`)}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrencyVisibility(Number(value) || 0, valuesHidden),
                        String(name) === 'lucro' ? 'Lucro' : 'Faturamento',
                      ]}
                      labelFormatter={(label) => (mesSelecionado === 'all' ? `Mês: ${label}` : `Dia: ${label}`)}
                    />
                    <Area
                      type="monotone"
                      dataKey="vendas"
                      stroke="#8b6453"
                      fill="url(#vendasGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="lucro"
                      stroke="#2a8a57"
                      fill="url(#lucroGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </article>

          <article className="section-card dashboard-pie-card">
            <div className="section-title-row">
              <h2>Status das vendas</h2>
              <span className="badge soft">{vendasFiltradas.length} registros</span>
            </div>

            {carregando ? (
              <div className="empty-state">Carregando distribuição...</div>
            ) : statusData.length === 0 ? (
              <div className="empty-state">Nenhuma venda encontrada para esse filtro.</div>
            ) : (
              <>
                <div className="pie-shell">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={54}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {statusData.map((entry) => (
                          <Cell key={entry.label} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${Number(value) || 0}`, 'Quantidade']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-legend-list">
                  {statusData.map((item) => (
                    <div key={item.label} className="dashboard-legend-row">
                      <div className="dashboard-legend-label">
                        <span className="dashboard-color-dot" style={{ background: item.color }} />
                        <strong>{item.label}</strong>
                      </div>
                      <span>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </article>
        </section>

        <section className="dashboard-secondary-grid">
          <article className="section-card">
            <div className="section-title-row">
              <h2>Produtos campeões</h2>
              <span className="badge soft">Top 5</span>
            </div>

            {carregando ? (
              <div className="empty-state">Carregando ranking...</div>
            ) : topProdutos.length === 0 ? (
              <div className="empty-state">Ainda não existem produtos vendidos nesse período.</div>
            ) : (
              <>
                <div className="chart-shell small">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProdutos} layout="vertical" margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(125, 96, 83, 0.12)" />
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="principal" width={110} tickLine={false} axisLine={false} stroke="#7a6156" />
                      <Tooltip formatter={(value) => [formatCurrencyVisibility(Number(value) || 0, valuesHidden), 'Receita']} />
                      <Bar dataKey="valor" fill="#8b6453" radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="dashboard-top-list">
                  {topProdutos.map((produto, index) => (
                    <TopListRow
                      key={produto.principal}
                      index={index}
                      principal={produto.principal}
                      detalhe={produto.detalhe}
                      secundario={produto.secundario}
                      valuesHidden={valuesHidden}
                    />
                  ))}
                </div>
              </>
            )}
          </article>

          <article className="section-card">
            <div className="section-title-row">
              <h2>Clientes em destaque</h2>
              <span className="badge soft">Mais valor gerado</span>
            </div>

            {carregando ? (
              <div className="empty-state">Carregando clientes...</div>
            ) : topClientes.length === 0 ? (
              <div className="empty-state">Ainda não existem clientes com compras no período.</div>
            ) : (
              <div className="dashboard-top-list">
                {topClientes.map((cliente, index) => (
                  <TopListRow
                    key={cliente.principal}
                    index={index}
                    principal={cliente.principal}
                    detalhe={cliente.detalhe}
                    secundario={cliente.secundario}
                    valuesHidden={valuesHidden}
                  />
                ))}
              </div>
            )}
          </article>
        </section>

        <section className="dashboard-alert-grid">
          <article className="section-card">
            <div className="section-title-row">
              <h2>Alertas operacionais</h2>
              <span className="badge warning">Atenção</span>
            </div>

            <div className="dashboard-alert-list">
              <AlertLine
                icon={<CircleDollarSign size={18} />}
                title="Despesas no período"
                value={formatCurrencyVisibility(resumo.despesas, valuesHidden)}
                description="Use esse número para monitorar o custo operacional das entregas."
              />
              <AlertLine
                icon={<BadgeDollarSign size={18} />}
                title="Margem média"
                value={`${resumo.margem.toFixed(1)}%`}
                description="Margem estimada calculada a partir do valor vendido menos as despesas da venda."
              />
              <AlertLine
                icon={<Boxes size={18} />}
                title="Produtos com estoque baixo"
                value={String(produtosAlerta.filter((produto) => Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD).length)}
                description="Itens que merecem reposição ou atenção do estoque."
              />
            </div>
          </article>

          <article className="section-card">
            <div className="section-title-row">
              <h2>Estoque em alerta</h2>
              <span className="badge danger">Reposição</span>
            </div>

            {carregando ? (
              <div className="empty-state">Carregando alertas...</div>
            ) : produtosAlerta.length === 0 ? (
              <div className="empty-state">Nenhum produto em estoque foi cadastrado ainda.</div>
            ) : (
              <div className="dashboard-top-list">
                {produtosAlerta.map((produto, index) => (
                  <TopListRow
                    key={produto.id}
                    index={index}
                    principal={produto.nome}
                    detalhe={`${Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD ? 'Baixo estoque' : 'Estoque ok'}`}
                    secundario={formatQuantity(Number(produto.estoque_atual), produto.unidade)}
                    danger={Number(produto.estoque_atual) <= LOW_STOCK_THRESHOLD}
                    valuesHidden={false}
                  />
                ))}
              </div>
            )}
          </article>
        </section>
      </div>
    </AppShell>
  )
}

function DashboardMetricCard({
  alert = false,
  help,
  icon,
  label,
  value,
}: {
  alert?: boolean
  help: string
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <article className={alert ? 'metric-card dashboard-metric-card alert' : 'metric-card dashboard-metric-card'}>
      <div className="dashboard-metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{help}</small>
    </article>
  )
}

function TopListRow({
  danger = false,
  detalhe,
  index,
  principal,
  secundario,
  valuesHidden,
}: {
  danger?: boolean
  detalhe: string
  index: number
  principal: string
  secundario: string
  valuesHidden: boolean
}) {
  return (
    <div className={danger ? 'dashboard-top-row danger' : 'dashboard-top-row'}>
      <div className="dashboard-rank-badge">{index + 1}</div>
      <div className="dashboard-top-copy">
        <strong>{principal}</strong>
        <span>{detalhe}</span>
      </div>
      <strong className="dashboard-top-value">{valuesHidden ? 'R$ ••••' : secundario}</strong>
    </div>
  )
}

function AlertLine({
  description,
  icon,
  title,
  value,
}: {
  description: string
  icon: React.ReactNode
  title: string
  value: string
}) {
  return (
    <div className="dashboard-alert-line">
      <div className="dashboard-alert-icon">{icon}</div>
      <div className="dashboard-alert-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
      <strong className="dashboard-alert-value">{value}</strong>
    </div>
  )
}
