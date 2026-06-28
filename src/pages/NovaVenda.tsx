import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/AppShell'
import { formatCurrencyVisibility, toDatetimeLocalValue, toIsoFromDatetimeLocal } from '../lib/formatters'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import { usePrivacy } from '../contexts/usePrivacy'
import type { Pessoa } from '../types/Pessoa'
import type { Produto } from '../types/Produto'
import type { VendaStatus } from '../types/Venda'
import './NovaVenda.css'

type NovaVendaProps = {
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  onVendaSalva: () => void
  onRefreshData: () => void
}

type DespesaVenda = {
  descricao: string
  valor: number
}

type VendaItemTela = {
  controla_estoque: boolean
  preco_unitario: number
  produto_id: string
  produto_nome: string
  quantidade: number
  subtotal: number
  unidade: string
}

async function buscarPessoas(nome: string) {
  let query = supabase
    .from('pessoas')
    .select('id, tipo_id, nome, telefone, endereco, observacao, ativo, criado_em')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(8)

  if (nome.trim()) {
    query = query.ilike('nome', `%${nome.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Pessoa[]
}

async function buscarProdutos(nome: string) {
  let query = supabase
    .from('produtos')
    .select('id, nome, descricao, preco, unidade, controla_estoque, estoque_atual, ativo, criado_em')
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(10)

  if (nome.trim()) {
    query = query.ilike('nome', `%${nome.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Produto[]
}

async function buscarTipoClienteId() {
  const { data, error } = await supabase
    .from('pessoas_tipos')
    .select('id')
    .ilike('nome', 'Cliente')
    .single()

  if (error) {
    throw error
  }

  return data.id as string
}

async function resolverPessoaId(clienteNome: string, pessoaSelecionadaId: string | null) {
  if (pessoaSelecionadaId) {
    return pessoaSelecionadaId
  }

  const nome = clienteNome.trim()

  if (!nome) {
    throw new Error('Informe o cliente.')
  }

  const { data: pessoaExistente, error: pessoaError } = await supabase
    .from('pessoas')
    .select('id')
    .ilike('nome', nome)
    .maybeSingle()

  if (pessoaError) {
    throw pessoaError
  }

  if (pessoaExistente) {
    return pessoaExistente.id as string
  }

  const tipoClienteId = await buscarTipoClienteId()
  const { data: pessoaNova, error: pessoaNovaError } = await supabase
    .from('pessoas')
    .insert({
      ativo: true,
      nome,
      tipo_id: tipoClienteId,
    })
    .select('id')
    .single()

  if (pessoaNovaError) {
    throw pessoaNovaError
  }

  return pessoaNova.id as string
}

async function registrarSaidasEstoque(vendaId: string, itens: VendaItemTela[]) {
  for (const item of itens) {
    if (!item.controla_estoque) {
      continue
    }

    const { data: produtoAtual, error: produtoError } = await supabase
      .from('produtos')
      .select('estoque_atual')
      .eq('id', item.produto_id)
      .single()

    if (produtoError) {
      throw produtoError
    }

    const estoqueAtual = Number(produtoAtual.estoque_atual || 0)
    const estoqueFinal = Math.max(0, estoqueAtual - item.quantidade)

    const { error: updateError } = await supabase
      .from('produtos')
      .update({ estoque_atual: estoqueFinal })
      .eq('id', item.produto_id)

    if (updateError) {
      throw updateError
    }

    const { error: movimentoError } = await supabase.from('movimentacoes_estoque').insert({
      motivo: `Venda ${vendaId}`,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      tipo: 'saida',
      venda_id: vendaId,
    })

    if (movimentoError) {
      throw movimentoError
    }
  }
}

async function criarVenda(params: {
  clienteNome: string
  dataVenda: string
  despesasTotal: number
  itens: VendaItemTela[]
  pessoaSelecionadaId: string | null
  status: VendaStatus
  valorPago: number
  valorPendente: number
  valorTotal: number
}) {
  const pessoaId = await resolverPessoaId(params.clienteNome, params.pessoaSelecionadaId)

  const { data: vendaData, error: vendaError } = await supabase
    .from('vendas')
    .insert({
      data_venda: params.dataVenda,
      despesa_total: params.despesasTotal,
      desconto_total: 0,
      forma_pagamento: params.valorPago > 0 ? 'pix' : null,
      observacao: null,
      pessoa_id: pessoaId,
      status: params.status,
      valor_pago: params.valorPago,
      valor_pendente: params.valorPendente,
      valor_total: params.valorTotal,
    })
    .select('id')
    .single()

  if (vendaError) {
    throw vendaError
  }

  const vendaId = vendaData.id as string

  const { error: itensError } = await supabase.from('vendas_itens').insert(
    params.itens.map((item) => ({
      preco_unitario: item.preco_unitario,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      subtotal: item.subtotal,
      venda_id: vendaId,
    })),
  )

  if (itensError) {
    throw itensError
  }

  await registrarSaidasEstoque(vendaId, params.itens)
  return vendaId
}

export function NovaVenda({
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  onRefreshData,
  onVendaSalva,
}: NovaVendaProps) {
  const { valuesHidden } = usePrivacy()
  const [clienteNome, setClienteNome] = useState('')
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null)
  const [clientesSugeridos, setClientesSugeridos] = useState<Pessoa[]>([])
  const [mostrarClientes, setMostrarClientes] = useState(false)

  const [produtoBusca, setProdutoBusca] = useState('')
  const [produtosSugeridos, setProdutosSugeridos] = useState<Produto[]>([])
  const [mostrarProdutos, setMostrarProdutos] = useState(false)

  const [itens, setItens] = useState<VendaItemTela[]>([])
  const [despesas, setDespesas] = useState<DespesaVenda[]>([])
  const [statusEntrega, setStatusEntrega] = useState<VendaStatus>('pendente')
  const [dataEntrega, setDataEntrega] = useState(toDatetimeLocalValue())
  const [valorPago, setValorPago] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        if (!mostrarClientes) {
          return
        }

        const resultado = await buscarPessoas(clienteNome)
        setClientesSugeridos(resultado)
      } catch {
        setClientesSugeridos([])
      }
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [clienteNome, mostrarClientes])

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        if (!mostrarProdutos) {
          return
        }

        const resultado = await buscarProdutos(produtoBusca)
        setProdutosSugeridos(resultado)
      } catch {
        setProdutosSugeridos([])
      }
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [mostrarProdutos, produtoBusca])

  const subtotalProdutos = useMemo(
    () => itens.reduce((total, item) => total + item.subtotal, 0),
    [itens],
  )

  const totalDespesas = useMemo(
    () => despesas.reduce((total, despesa) => total + despesa.valor, 0),
    [despesas],
  )

  const valorPagoNumero = Number(valorPago.replace(',', '.')) || 0
  const valorTotal = subtotalProdutos
  const valorPendente = Math.max(valorTotal - valorPagoNumero, 0)

  function selecionarCliente(cliente: Pessoa) {
    setClienteNome(cliente.nome)
    setClienteSelecionadoId(cliente.id)
    setMostrarClientes(false)
  }

  function selecionarProduto(produto: Produto) {
    const preco = Number(produto.preco || 0)

    setItens((current) => {
      const index = current.findIndex((item) => item.produto_id === produto.id)

      if (index >= 0) {
        return current.map((item, itemIndex) => {
          if (itemIndex !== index) {
            return item
          }

          const quantidade = item.quantidade + 1

          return {
            ...item,
            quantidade,
            subtotal: quantidade * item.preco_unitario,
          }
        })
      }

      return [
        ...current,
        {
          controla_estoque: Boolean(produto.controla_estoque),
          preco_unitario: preco,
          produto_id: produto.id,
          produto_nome: produto.nome,
          quantidade: 1,
          subtotal: preco,
          unidade: produto.unidade || 'un',
        },
      ]
    })

    setProdutoBusca('')
    setMostrarProdutos(false)
  }

  function alterarQuantidade(index: number, novoValor: number) {
    const quantidade = Math.max(1, novoValor)
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantidade,
              subtotal: quantidade * item.preco_unitario,
            }
          : item,
      ),
    )
  }

  function removerItem(index: number) {
    setItens((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function adicionarDespesa() {
    setDespesas((current) => [...current, { descricao: '', valor: 0 }])
  }

  function alterarDespesa(index: number, campo: keyof DespesaVenda, valor: string) {
    setDespesas((current) =>
      current.map((despesa, itemIndex) =>
        itemIndex === index
          ? {
              ...despesa,
              [campo]: campo === 'valor' ? Number(valor.replace(',', '.')) || 0 : valor,
            }
          : despesa,
      ),
    )
  }

  function removerDespesa(index: number) {
    setDespesas((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function salvarVenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!clienteNome.trim()) {
      setErro('Informe ou selecione um cliente.')
      return
    }

    if (itens.length === 0) {
      setErro('Selecione pelo menos um produto existente.')
      return
    }

    setSalvando(true)

    try {
      await criarVenda({
        clienteNome,
        dataVenda: toIsoFromDatetimeLocal(dataEntrega),
        despesasTotal: totalDespesas,
        itens,
        pessoaSelecionadaId: clienteSelecionadoId,
        status: statusEntrega,
        valorPago: valorPagoNumero,
        valorPendente,
        valorTotal,
      })

      onRefreshData()
      onVendaSalva()
    } catch (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao salvar a venda.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AppShell
      activeNav="vendas"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <form className="page-stack" onSubmit={salvarVenda}>
        <section className="page-hero">
          <div>
            <h1 className="page-title">Nova Venda</h1>
            <p className="page-subtitle">Selecione produtos existentes e salve o cliente novo se ele ainda não estiver cadastrado.</p>
          </div>
        </section>

        <section className="section-card form-stack">
          <div className="field-block">
            <label htmlFor="cliente">Cliente</label>
            <div className="autocomplete-box">
              <input
                id="cliente"
                className="text-field"
                type="text"
                placeholder="Buscar cliente ou digitar novo nome"
                value={clienteNome}
                autoComplete="off"
                onFocus={() => setMostrarClientes(true)}
                onChange={(event) => {
                  setClienteNome(event.target.value)
                  setClienteSelecionadoId(null)
                  setMostrarClientes(true)
                }}
              />

              {mostrarClientes && clientesSugeridos.length > 0 && (
                <div className="suggestions-panel">
                  {clientesSugeridos.map((cliente) => (
                    <button key={cliente.id} type="button" onClick={() => selecionarCliente(cliente)}>
                      <strong>{cliente.nome}</strong>
                      <small>{cliente.telefone || 'Cadastro existente'}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="field-block">
            <label htmlFor="produto">Produtos</label>
            <div className="autocomplete-box">
              <input
                id="produto"
                className="text-field"
                type="text"
                placeholder="Pesquisar produto cadastrado"
                value={produtoBusca}
                autoComplete="off"
                onFocus={() => setMostrarProdutos(true)}
                onChange={(event) => {
                  setProdutoBusca(event.target.value)
                  setMostrarProdutos(true)
                }}
              />

              {mostrarProdutos && produtosSugeridos.length > 0 && (
                <div className="suggestions-panel">
                  {produtosSugeridos.map((produto) => (
                    <button key={produto.id} type="button" onClick={() => selecionarProduto(produto)}>
                      <strong>{produto.nome}</strong>
                      <small>
                        {formatCurrencyVisibility(Number(produto.preco) || 0, valuesHidden)} / {produto.unidade}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {itens.length === 0 ? (
            <div className="empty-state">Escolha um produto existente para montar a venda.</div>
          ) : (
            <div className="list-stack">
              {itens.map((item, index) => (
                <article key={item.produto_id} className="list-card sale-item-card">
                  <div className="list-card-top">
                    <div>
                      <p className="list-card-title">{item.produto_nome}</p>
                      <p className="list-card-subtitle">
                        {formatCurrencyVisibility(item.preco_unitario, valuesHidden)} / {item.unidade}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="icon-button sale-trash-button"
                      onClick={() => removerItem(index)}
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="sale-item-bottom">
                    <div className="quantity-stepper">
                      <button type="button" onClick={() => alterarQuantidade(index, item.quantidade - 1)}>
                        <Minus size={16} />
                      </button>
                      <span>{item.quantidade}</span>
                      <button type="button" onClick={() => alterarQuantidade(index, item.quantidade + 1)}>
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="sale-item-subtotal">
                      <span>Subtotal</span>
                      <strong>{formatCurrencyVisibility(item.subtotal, valuesHidden)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section-card form-stack">
          <div className="field-block">
            <label>Status da entrega</label>
            <div className="inline-actions">
              <button
                type="button"
                className={statusEntrega === 'entregue' ? 'secondary-button status-pill active' : 'secondary-button status-pill'}
                onClick={() => setStatusEntrega('entregue')}
              >
                Entregue
              </button>
              <button
                type="button"
                className={statusEntrega === 'pendente' ? 'secondary-button status-pill active' : 'secondary-button status-pill'}
                onClick={() => setStatusEntrega('pendente')}
              >
                Pendente
              </button>
            </div>
          </div>

          <div className="field-block">
            <label htmlFor="data-entrega">Data da venda</label>
            <input
              id="data-entrega"
              className="text-field"
              type="datetime-local"
              value={dataEntrega}
              onChange={(event) => setDataEntrega(event.target.value)}
            />
          </div>
        </section>

        <section className="section-card form-stack">
          <div className="section-title-row">
            <h2>Despesas da venda</h2>
            <button type="button" className="section-link" onClick={adicionarDespesa}>
              Adicionar despesa
            </button>
          </div>

          {despesas.length === 0 && (
            <button type="button" className="ghost-button full-width expense-empty-button" onClick={adicionarDespesa}>
              Ex: Gasolina
            </button>
          )}

          {despesas.map((despesa, index) => (
            <div key={index} className="expense-row">
              <input
                className="text-field"
                type="text"
                value={despesa.descricao}
                placeholder="Descrição"
                onChange={(event) => alterarDespesa(index, 'descricao', event.target.value)}
              />
              <input
                className="text-field"
                type="number"
                min="0"
                step="0.01"
                value={despesa.valor || ''}
                placeholder="0,00"
                onChange={(event) => alterarDespesa(index, 'valor', event.target.value)}
              />
              <button type="button" className="secondary-button expense-remove-button" onClick={() => removerDespesa(index)}>
                Remover
              </button>
            </div>
          ))}
        </section>

        <section className="summary-sale-card">
          <div className="split-values">
            <span>Subtotal produtos</span>
            <strong>{formatCurrencyVisibility(subtotalProdutos, valuesHidden)}</strong>
          </div>

          <div className="split-values">
            <span>Total despesas</span>
            <strong>{formatCurrencyVisibility(totalDespesas, valuesHidden)}</strong>
          </div>

          <div className="split-values summary-grand-total">
            <span>Total geral</span>
            <strong>{formatCurrencyVisibility(valorTotal, valuesHidden)}</strong>
          </div>
        </section>

        <section className="section-card form-stack">
          <div className="field-block">
            <label htmlFor="valor-pago">Valor pago</label>
            <input
              id="valor-pago"
              className="text-field paid-value-field"
              type="number"
              min="0"
              step="0.01"
              value={valorPago}
              onChange={(event) => setValorPago(event.target.value)}
              placeholder="0,00"
            />
          </div>
        </section>

        <section className={valorPendente > 0 ? 'payment-alert pending' : 'payment-alert done'}>
          <span>{valorPendente > 0 ? 'Saldo pendente' : 'Venda quitada'}</span>
          <strong>{formatCurrencyVisibility(valorPendente, valuesHidden)}</strong>
        </section>

        {erro && <div className="page-error">{erro}</div>}

        <div className="sale-submit-wrap">
          <button type="submit" className="primary-button full-width sale-submit-button" disabled={salvando}>
            {salvando ? 'Salvando venda...' : statusEntrega === 'pendente' ? 'Salvar venda pendente' : 'Salvar e finalizar venda'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
