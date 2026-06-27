import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Menu.css'
import type { Venda, ResumoVendas } from '../types/venda'

type MenuProps = {
  onLogout: () => void
}

export function Menu({ onLogout }: MenuProps) {
  const [carregando, setCarregando] = useState(true)

  const [resumo, setResumo] = useState<ResumoVendas>({
  vendasDoDia: 0,
  valorTotal: 0,
  pendentes: 0,
  estoqueBaixo: '-',
  entregasPendentes: 0,
})

  const [entregasPendentes, setEntregasPendentes] = useState<Venda[]>([])
  const [ultimasEntregas, setUltimasEntregas] = useState<Venda[]>([])

  useEffect(() => {
    carregarDadosMenu()
  }, [])

  async function carregarDadosMenu() {
    setCarregando(true)

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const inicioDoDia = hoje.toISOString()

    const { data: vendasHoje, error: erroVendasHoje } = await supabase
      .from('vendas')
      .select('id, valor_total, despesa_total, desconto_total, status_entrega, created_at')
      .gte('created_at', inicioDoDia)

    if (erroVendasHoje) {
      console.error(erroVendasHoje)
      setCarregando(false)
      return
    }

    const { data: pendentes, error: erroPendentes } = await supabase
      .from('vendas')
      .select(
        'id, cliente_nome, produto_nome, quantidade, valor_total, despesa_total, desconto_total, status_entrega, created_at, updated_at'
      )
      .neq('status_entrega', 'entregue')
      .order('created_at', { ascending: false })

    if (erroPendentes) {
      console.error(erroPendentes)
      setCarregando(false)
      return
    }

    const { data: entregues, error: erroEntregues } = await supabase
      .from('vendas')
      .select(
        'id, cliente_nome, produto_nome, quantidade, valor_total, despesa_total, desconto_total, status_entrega, created_at, updated_at'
      )
      .eq('status_entrega', 'entregue')
      .order('updated_at', { ascending: false })
      .limit(5)

    if (erroEntregues) {
      console.error(erroEntregues)
      setCarregando(false)
      return
    }

    const valorTotal = vendasHoje.reduce((total, venda) => {
      return total + Number(venda.valor_total || 0)
    }, 0)

    setResumo({
      vendasDoDia: vendasHoje.length,
      valorTotal,
      pendentes: pendentes.length,
      estoqueBaixo: '-',
      entregasPendentes: pendentes.length,
    })

    setEntregasPendentes(pendentes)
    setUltimasEntregas(entregues)
    setCarregando(false)
  }

  return (
    <main className="menu-page">
      <div className="menu-shell">
        <header className="top-bar">
          <button className="menu-button" type="button">
            ☰
          </button>

          <strong className="app-title">LumberLog</strong>

          <button type="button" className="logout-button" onClick={onLogout}>
            Sair
          </button>
        </header>

        <section className="menu-content">
          <div className="welcome-area">
            <h1>Olá, Gerente</h1>
            <p>Aqui está o resumo da sua operação hoje.</p>
          </div>

          <button className="new-sale-button" type="button">
            🛒 Nova Venda
          </button>

          <section className="summary-grid">
            <DashboardCard
              icon="📅"
              title="Vendas do Dia"
              value={String(resumo.vendasDoDia)}
            />

            <DashboardCard
              icon="💵"
              title="Valor Total"
              value={resumo.valorTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            />

            <DashboardCard
              icon="⏳"
              title="Pendentes"
              value={String(resumo.pendentes).padStart(2, '0')}
            />

            <DashboardCard
              icon="⚠️"
              title="Estoque Baixo"
              value={resumo.estoqueBaixo}
              danger
            />

            <DashboardCard
              icon="🚚"
              title="Entregas Pendentes"
              value={String(resumo.entregasPendentes).padStart(2, '0')}
              urgent
            />
          </section>

          <section className="menu-section">
            <div className="section-header">
              <h2>Entregas Pendentes</h2>
              <button type="button">Ver tudo</button>
            </div>

            {carregando && <p className="empty-message">Carregando...</p>}

            {!carregando && entregasPendentes.length === 0 && (
              <p className="empty-message">Nenhuma entrega pendente.</p>
            )}

            {!carregando &&
              entregasPendentes.map((venda) => (
                <DeliveryCard
                  key={venda.id}
                  client={venda.cliente_nome}
                  description={`${venda.quantidade} ${venda.produto_nome}`}
                  status={venda.status_entrega}
                />
              ))}
          </section>

          <section className="menu-section">
            <div className="section-header">
              <h2>Últimas Entregas</h2>
              <button type="button">Ver tudo</button>
            </div>

            {carregando && <p className="empty-message">Carregando...</p>}

            {!carregando && ultimasEntregas.length === 0 && (
              <p className="empty-message">Nenhuma entrega concluída.</p>
            )}

            {!carregando &&
              ultimasEntregas.map((venda) => (
                <DeliveryCard
                  key={venda.id}
                  client={venda.cliente_nome}
                  description={`${venda.quantidade} ${venda.produto_nome}`}
                  status="Entregue"
                />
              ))}
          </section>
        </section>

        <nav className="bottom-nav">
          <button className="bottom-nav-item active" type="button">
            <span>▦</span>
            <strong>Menu</strong>
          </button>

          <button className="bottom-nav-item" type="button">
            <span>🛒</span>
            <strong>Venda</strong>
          </button>

          <button className="bottom-nav-item" type="button">
            <span>🌲</span>
            <strong>Produtos</strong>
          </button>
        </nav>
      </div>
    </main>
  )
}

type DashboardCardProps = {
  icon: string
  title: string
  value: string
  danger?: boolean
  urgent?: boolean
}

function DashboardCard({ icon, title, value, danger, urgent }: DashboardCardProps) {
  return (
    <div
      className={[
        'dashboard-card',
        danger ? 'danger' : '',
        urgent ? 'urgent' : '',
      ].join(' ')}
    >
      <div className="dashboard-card-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

type DeliveryCardProps = {
  client: string
  description: string
  status: string
}

function DeliveryCard({ client, description, status }: DeliveryCardProps) {
  return (
    <button className="delivery-card" type="button">
      <div>
        <strong>{client}</strong>
        <p>{description}</p>
      </div>

      <span>{status}</span>
    </button>
  )
}