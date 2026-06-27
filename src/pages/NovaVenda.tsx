import { supabase } from '../lib/supabase'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './NovaVenda.css'

import type { Pessoa } from '../types/Pessoa'
import type { Produto } from '../types/Produto'
import type { VendaStatus } from '../types/venda'

type DespesaVenda = {
  descricao: string
  valor: number
}

type VendaItemTela = {
  produto_id: string
  produto_nome: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

async function buscarPessoasPorNome(nome: string): Promise<Pessoa[]> {
  const termo = nome.trim()

  if (!termo) {
    return []
  }

  const { data, error } = await supabase
    .from('pessoas')
    .select('id, tipo_id, nome, telefone, endereco, observacao, ativo, criado_em')
    .ilike('nome', `%${termo}%`)
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(8)

  if (error) {
    throw error
  }

  return data ?? []
}

async function buscarProdutosPorNome(nome: string): Promise<Produto[]> {
  const termo = nome.trim()

  if (!termo) {
    return []
  }

  const { data, error } = await supabase
    .from('produtos')
    .select('id, nome, descricao, preco, unidade, controla_estoque, estoque_atual, ativo, criado_em')
    .ilike('nome', `%${termo}%`)
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(8)

  if (error) {
    throw error
  }

  return data ?? []
}

async function buscarTipoClienteId(): Promise<string> {
  const { data, error } = await supabase
    .from('pessoas_tipos')
    .select('id')
    .eq('nome', 'Cliente')
    .single()

  if (error) {
    throw error
  }

  return data.id
}

async function resolverPessoaPorNome(
  pessoaNome: string,
  pessoaSelecionadaId: string | null
): Promise<string> {
  if (pessoaSelecionadaId) {
    return pessoaSelecionadaId
  }

  const nome = pessoaNome.trim()

  if (!nome) {
    throw new Error('Informe o cliente.')
  }

  const { data: pessoaExistente, error: erroBusca } = await supabase
    .from('pessoas')
    .select('id')
    .ilike('nome', nome)
    .maybeSingle()

  if (erroBusca) {
    throw erroBusca
  }

  if (pessoaExistente) {
    return pessoaExistente.id
  }

  const tipoClienteId = await buscarTipoClienteId()

  const { data: novaPessoa, error: erroCadastro } = await supabase
    .from('pessoas')
    .insert({
      tipo_id: tipoClienteId,
      nome,
      ativo: true,
    })
    .select('id')
    .single()

  if (erroCadastro) {
    throw erroCadastro
  }

  return novaPessoa.id
}

async function criarVenda(params: {
  pessoa_id: string
  data_venda: string
  status: VendaStatus | string
  valor_total: number
  valor_pago: number
  valor_pendente: number
  despesa_total: number
  desconto_total: number
  observacao: string | null
  itens: VendaItemTela[]
}) {
  const { itens, ...venda } = params

  const { data: vendaCriada, error: erroVenda } = await supabase
    .from('vendas')
    .insert(venda)
    .select('id')
    .single()

  if (erroVenda) {
    throw erroVenda
  }

  const vendaId = vendaCriada.id as string

  const itensParaInserir = itens.map((item) => ({
    venda_id: vendaId,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    preco_unitario: item.preco_unitario,
    subtotal: item.subtotal,
  }))

  const { error: erroItens } = await supabase
    .from('vendas_itens')
    .insert(itensParaInserir)

  if (erroItens) {
    throw erroItens
  }

  return vendaId
}

type NovaVendaProps = {
  onVoltar?: () => void
  onVendaSalva?: () => void
}

function moeda(valor: number) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function agoraParaDatetimeLocal() {
  const agora = new Date()
  agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset())
  return agora.toISOString().slice(0, 16)
}

function formatarDataHoraParaBanco(valor: string) {
  if (!valor) {
    return new Date().toISOString()
  }

  return new Date(valor).toISOString()
}

export function NovaVenda({ onVoltar, onVendaSalva }: NovaVendaProps) {
  const [clienteNome, setClienteNome] = useState('')
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null)
  const [clientesSugeridos, setClientesSugeridos] = useState<Pessoa[]>([])
  const [mostrarSugestoesCliente, setMostrarSugestoesCliente] = useState(false)

  const [produtoBusca, setProdutoBusca] = useState('')
  const [produtosSugeridos, setProdutosSugeridos] = useState<Produto[]>([])
  const [mostrarSugestoesProduto, setMostrarSugestoesProduto] = useState(false)

  const [itens, setItens] = useState<VendaItemTela[]>([])
  const [despesas, setDespesas] = useState<DespesaVenda[]>([])

const [statusEntrega, setStatusEntrega] = useState<VendaStatus>('pendente')
  const [dataEntrega, setDataEntrega] = useState(agoraParaDatetimeLocal())
  const [valorPago, setValorPago] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        if (!clienteNome.trim() || clienteSelecionadoId) {
          setClientesSugeridos([])
          return
        }

        const clientes = await buscarPessoasPorNome(clienteNome)
        setClientesSugeridos(clientes)
      } catch {
        setClientesSugeridos([])
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [clienteNome, clienteSelecionadoId])

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        if (!produtoBusca.trim()) {
          setProdutosSugeridos([])
          return
        }

        const produtos = await buscarProdutosPorNome(produtoBusca)
        setProdutosSugeridos(produtos)
      } catch {
        setProdutosSugeridos([])
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [produtoBusca])

  const subtotalProdutos = useMemo(() => {
    return itens.reduce((total, item) => total + item.subtotal, 0)
  }, [itens])

  const totalDespesas = useMemo(() => {
    return despesas.reduce((total, despesa) => total + despesa.valor, 0)
  }, [despesas])

  const valorPagoNumero = Number(valorPago.replace(',', '.')) || 0

  const valorProdutos = subtotalProdutos
const descontoTotal = 0
const valorTotalVenda = Math.max(valorProdutos - descontoTotal, 0)
const valorPendente = Math.max(valorTotalVenda - valorPagoNumero, 0)
const lucroEstimado = valorTotalVenda - totalDespesas

  function selecionarCliente(cliente: Pessoa) {
    setClienteNome(cliente.nome)
    setClienteSelecionadoId(cliente.id)
    setClientesSugeridos([])
    setMostrarSugestoesCliente(false)
  }

  function selecionarProduto(produto: Produto) {
  const preco = Number(produto.preco) || 0

  const novoItem: VendaItemTela = {
    produto_id: produto.id,
    produto_nome: produto.nome,
    quantidade: 1,
    preco_unitario: preco,
    subtotal: preco,
  }

  setItens((itensAtuais) => [...itensAtuais, novoItem])
  setProdutoBusca('')
  setProdutosSugeridos([])
  setMostrarSugestoesProduto(false)
}

  function alterarQuantidadeItem(index: number, quantidade: number) {
    const quantidadeSegura = Math.max(1, quantidade)

    setItens((itensAtuais) =>
      itensAtuais.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item
        }

        return {
          ...item,
          quantidade: quantidadeSegura,
          subtotal: quantidadeSegura * item.preco_unitario,
        }
      })
    )
  }

  function removerItem(index: number) {
    setItens((itensAtuais) => itensAtuais.filter((_, itemIndex) => itemIndex !== index))
  }

  function adicionarDespesa() {
    setDespesas((despesasAtuais) => [
      ...despesasAtuais,
      {
        descricao: '',
        valor: 0,
      },
    ])
  }

  function alterarDespesa(index: number, campo: keyof DespesaVenda, valor: string) {
    setDespesas((despesasAtuais) =>
      despesasAtuais.map((despesa, despesaIndex) => {
        if (despesaIndex !== index) {
          return despesa
        }

        if (campo === 'valor') {
          return {
            ...despesa,
            valor: Number(valor.replace(',', '.')) || 0,
          }
        }

        return {
          ...despesa,
          [campo]: valor,
        }
      })
    )
  }

  function removerDespesa(index: number) {
    setDespesas((despesasAtuais) =>
      despesasAtuais.filter((_, despesaIndex) => despesaIndex !== index)
    )
  }

  async function salvarVenda(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setErro(null)

      if (!clienteNome.trim()) {
        setErro('Informe o cliente.')
        return
      }

      if (itens.length === 0) {
        setErro('Adicione pelo menos um produto.')
        return
      }

      setSalvando(true)

      const pessoaId = await resolverPessoaPorNome(clienteNome, clienteSelecionadoId)

      await criarVenda({
  pessoa_id: pessoaId,
  data_venda: formatarDataHoraParaBanco(dataEntrega),
  status: statusEntrega,
  valor_total: valorTotalVenda,
  valor_pago: valorPagoNumero,
  valor_pendente: valorPendente,
  despesa_total: totalDespesas,
  desconto_total: descontoTotal,
  observacao: null,
  itens,
})

      onVendaSalva?.()
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : 'Erro ao salvar a venda.'

      setErro(mensagem)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="nova-venda-page">
      <form className="nova-venda-shell" onSubmit={salvarVenda}>
        <header className="nova-venda-header">
          <button
            type="button"
            className="voltar-button"
            onClick={onVoltar}
            aria-label="Voltar"
          >
            ←
          </button>

          <h1>Nova Venda</h1>

          <div className="header-avatar" aria-hidden="true">
            🪵
          </div>
        </header>

        <section className="form-section">
          <div className="section-row">
            <label htmlFor="cliente">Cliente</label>
            <span>Alternar Manual/Lista</span>
          </div>

          <div className="autocomplete-wrapper">
            <input
              id="cliente"
              type="text"
              value={clienteNome}
              placeholder="Pesquisar ou selecionar cliente"
              autoComplete="off"
              onFocus={() => setMostrarSugestoesCliente(true)}
              onChange={(event) => {
                setClienteNome(event.target.value)
                setClienteSelecionadoId(null)
                setMostrarSugestoesCliente(true)
              }}
            />

            {mostrarSugestoesCliente && clientesSugeridos.length > 0 && (
              <div className="suggestions-box">
                {clientesSugeridos.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => selecionarCliente(cliente)}
                  >
                    {cliente.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="form-section">
          <div className="section-row">
            <label htmlFor="produto">Produtos</label>
            <button
              type="button"
              className="link-button"
              onClick={() => setMostrarSugestoesProduto(true)}
            >
              ⊕ Adicionar Produto
            </button>
          </div>

          <div className="autocomplete-wrapper">
            <input
              id="produto"
              type="text"
              value={produtoBusca}
              placeholder="Pesquisar produto"
              autoComplete="off"
              onFocus={() => setMostrarSugestoesProduto(true)}
              onChange={(event) => {
                setProdutoBusca(event.target.value)
                setMostrarSugestoesProduto(true)
              }}
            />

            {mostrarSugestoesProduto && produtosSugeridos.length > 0 && (
              <div className="suggestions-box">
                {produtosSugeridos.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => selecionarProduto(produto)}
                  >
                    <strong>{produto.nome}</strong>
                    <small>{moeda(Number(produto.preco) || 0)}</small>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="itens-list">
            {itens.map((item, index) => (
              <article className="item-card" key={`${item.produto_id}-${index}`}>
                <div className="item-card-top">
                  <div>
                    <strong>{item.produto_nome}</strong>
                    <span>
                      {moeda(item.preco_unitario)} / un
                    </span>
                  </div>

                  <button type="button" onClick={() => removerItem(index)}>
                    🗑
                  </button>
                </div>

                <div className="item-card-bottom">
                  <div className="quantity-control">
                    <button
                      type="button"
                      onClick={() => alterarQuantidadeItem(index, item.quantidade - 1)}
                    >
                      −
                    </button>

                    <span>{item.quantidade}</span>

                    <button
                      type="button"
                      onClick={() => alterarQuantidadeItem(index, item.quantidade + 1)}
                    >
                      +
                    </button>
                  </div>

                  <div className="subtotal-box">
                    <span>Subtotal</span>
                    <strong>{moeda(item.subtotal)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="form-section">
          <label>Status da Entrega</label>

          <div className="status-grid">
            <button
              type="button"
              className={statusEntrega === 'entregue' ? 'status-button active' : 'status-button'}
              onClick={() => setStatusEntrega('entregue')}
            >
              🚚 Entregue
            </button>

            <button
              type="button"
              className={statusEntrega === 'pendente' ? 'status-button active' : 'status-button'}
              onClick={() => setStatusEntrega('pendente')}
            >
              ⏱ Pendente
            </button>
          </div>
        </section>

        <section className="form-section">
          <label htmlFor="dataEntrega">Data e Hora da Entrega</label>

          <input
            id="dataEntrega"
            type="datetime-local"
            value={dataEntrega}
            onChange={(event) => setDataEntrega(event.target.value)}
          />
        </section>

        <section className="form-section">
          <div className="section-row">
            <label>Despesas da Venda</label>
            <button type="button" className="link-button" onClick={adicionarDespesa}>
              ⊕ Adicionar Despesa
            </button>
          </div>

          {despesas.length === 0 && (
            <button type="button" className="empty-expense-button" onClick={adicionarDespesa}>
              Ex: Gasolina
              <strong>{moeda(0)}</strong>
            </button>
          )}

          {despesas.map((despesa, index) => (
            <div className="expense-row" key={index}>
              <input
                type="text"
                value={despesa.descricao}
                placeholder="Ex: Gasolina"
                onChange={(event) => alterarDespesa(index, 'descricao', event.target.value)}
              />

              <input
                type="number"
                min="0"
                step="0.01"
                value={despesa.valor || ''}
                placeholder="0,00"
                onChange={(event) => alterarDespesa(index, 'valor', event.target.value)}
              />

              <button type="button" onClick={() => removerDespesa(index)}>
                ×
              </button>
            </div>
          ))}
        </section>

        <section className="summary-card">
          <div>
            <span>Subtotal Produtos</span>
            <strong>{moeda(subtotalProdutos)}</strong>
          </div>

          <div>
            <span>Total Despesas</span>
            <strong>{moeda(totalDespesas)}</strong>
          </div>

          <div className="summary-total">
            <span>Total da Venda</span>
                <strong>{moeda(valorTotalVenda)}</strong>
          </div>
        </section>

        <section className="form-section">
          <div className="section-row">
            <label htmlFor="valorPago">Valor Pago (R$)</label>
            <span>TECLADO NUMÉRICO ATIVADO</span>
          </div>

          <input
            id="valorPago"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={valorPago}
            placeholder="0,00"
            className="valor-pago-input"
            onChange={(event) => setValorPago(event.target.value)}
          />
        </section>

        <section className={valorPendente > 0 ? 'saldo-card pendente' : 'saldo-card quitado'}>
  <span>{valorPendente > 0 ? '⚠ Saldo Pendente' : '✓ Venda Quitada'}</span>
  <strong>{moeda(valorPendente)}</strong>
</section>

        {erro && <p className="erro-venda">{erro}</p>}

        <footer className="nova-venda-footer">
          <button type="submit" disabled={salvando}>
            {salvando
              ? 'Salvando...'
              : statusEntrega === 'pendente'
                ? '▣ Salvar Venda'
                : '▣ Salvar e Finalizar'}
          </button>
        </footer>
      </form>
    </main>
  )
}