import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Menu.css'
import type { ResumoVendas } from '../types/venda'
import type { EntregaResumo } from '../types/EntregaResumo'

type MenuProps = {
    onLogout: () => void
    onNovaVenda: () => void
}

type VendaConsulta = {
    id: string
    status: string
    valor_total: number
    despesa_total: number
    desconto_total: number
    data_venda: string
    criado_em: string
    pessoa: {
        nome: string
    } | null
    itens: {
        quantidade: number
        produto: {
            nome: string
            unidade: string
        } | null
    }[]
}

export function Menu({ onLogout, onNovaVenda }: MenuProps) {
    const [carregando, setCarregando] = useState(true)

    const [resumo, setResumo] = useState<ResumoVendas>({
        vendasDoDia: 0,
        valorTotal: 0,
        pendentes: 0,
        estoqueBaixo: '-',
        entregasPendentes: 0,
    })

    const [entregasPendentes, setEntregasPendentes] = useState<EntregaResumo[]>([])
    const [ultimasEntregas, setUltimasEntregas] = useState<EntregaResumo[]>([])

    useEffect(() => {
        carregarDadosMenu()
    }, [])

    function montarDescricaoProdutos(venda: VendaConsulta) {
        const itens = venda.itens ?? []

        if (itens.length === 0) {
            return 'Sem produtos'
        }

        return itens
            .map((item) => {
                const quantidade = Number(item.quantidade)
                const unidade = item.produto?.unidade ?? 'un'
                const nomeProduto = item.produto?.nome ?? 'Produto'

                return `${quantidade} ${unidade} ${nomeProduto}`
            })
            .join(', ')
    }

    function mapearEntrega(venda: VendaConsulta): EntregaResumo {
        return {
            id: venda.id,
            pessoa_nome: venda.pessoa?.nome ?? 'Cliente não informado',
            status: venda.status,
            produtos_descricao: montarDescricaoProdutos(venda),
        }
    }

    async function carregarDadosMenu() {
        setCarregando(true)

        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const inicioDoDia = hoje.toISOString()

        const { data: vendasHoje, error: erroVendasHoje } = await supabase
            .from('vendas')
            .select('id, valor_total, despesa_total, desconto_total, status, data_venda, criado_em')
            .gte('data_venda', inicioDoDia)

        if (erroVendasHoje) {
            console.error(erroVendasHoje)
            setCarregando(false)
            return
        }

        const { data: pendentes, error: erroPendentes } = await supabase
            .from('vendas')
            .select(`
        id,
        status,
        valor_total,
        despesa_total,
        desconto_total,
        data_venda,
        criado_em,
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
            .neq('status', 'entregue')
            .order('data_venda', { ascending: false })

        if (erroPendentes) {
            console.error(erroPendentes)
            setCarregando(false)
            return
        }

        const { data: entregues, error: erroEntregues } = await supabase
            .from('vendas')
            .select(`
        id,
        status,
        valor_total,
        despesa_total,
        desconto_total,
        data_venda,
        criado_em,
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
            .eq('status', 'entregue')
            .order('data_venda', { ascending: false })
            .limit(5)

        if (erroEntregues) {
            console.error(erroEntregues)
            setCarregando(false)
            return
        }

        const valorTotal = (vendasHoje ?? []).reduce((total, venda) => {
            return total + Number(venda.valor_total || 0)
        }, 0)

        const pendentesTipados = (pendentes ?? []) as unknown as VendaConsulta[]
        const entreguesTipados = (entregues ?? []) as unknown as VendaConsulta[]

        const entregasPendentesMapeadas = pendentesTipados.map(mapearEntrega)
        const ultimasEntregasMapeadas = entreguesTipados.map(mapearEntrega)

        setResumo({
            vendasDoDia: vendasHoje?.length ?? 0,
            valorTotal,
            pendentes: entregasPendentesMapeadas.length,
            estoqueBaixo: '-',
            entregasPendentes: entregasPendentesMapeadas.length,
        })

        setEntregasPendentes(entregasPendentesMapeadas)
        setUltimasEntregas(ultimasEntregasMapeadas)
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

                    <button className="new-sale-button" type="button" onClick={onNovaVenda}>
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
                                    client={venda.pessoa_nome}
                                    description={venda.produtos_descricao}
                                    status={venda.status}
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
                                    client={venda.pessoa_nome}
                                    description={venda.produtos_descricao}
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