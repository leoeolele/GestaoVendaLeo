import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/AppShell'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import './ProdutoForm.css'

type ProdutoFormProps = {
  onCancel: () => void
  onDeleted: () => void
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  onSaved: () => void
  produtoId?: string
}

type FormState = {
  ativo: boolean
  controlaEstoque: boolean
  descricao: string
  estoqueAtual: string
  nome: string
  preco: string
  unidade: string
}

const initialState: FormState = {
  ativo: true,
  controlaEstoque: true,
  descricao: '',
  estoqueAtual: '0',
  nome: '',
  preco: '',
  unidade: 'm3',
}

export function ProdutoForm({
  onCancel,
  onDeleted,
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  onSaved,
  produtoId,
}: ProdutoFormProps) {
  const [carregando, setCarregando] = useState(!!produtoId)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<FormState>(initialState)

  useEffect(() => {
    async function carregarProduto() {
      if (!produtoId) {
        setForm(initialState)
        setCarregando(false)
        return
      }

      setCarregando(true)
      setErro(null)

      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, descricao, preco, unidade, controla_estoque, estoque_atual, ativo')
        .eq('id', produtoId)
        .single()

      if (error) {
        setErro(getSupabaseErrorMessage(error, 'Erro ao carregar produto.'))
        setCarregando(false)
        return
      }

      setForm({
        ativo: Boolean(data.ativo),
        controlaEstoque: Boolean(data.controla_estoque),
        descricao: data.descricao ?? '',
        estoqueAtual: String(data.estoque_atual ?? 0),
        nome: data.nome ?? '',
        preco: String(data.preco ?? ''),
        unidade: data.unidade ?? 'm3',
      })
      setCarregando(false)
    }

    void carregarProduto()
  }, [produtoId])

  async function salvarProduto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!form.nome.trim()) {
      setErro('Informe o nome do produto.')
      return
    }

    setSalvando(true)

    const payload = {
      ativo: form.ativo,
      controla_estoque: form.controlaEstoque,
      descricao: form.descricao.trim() || null,
      estoque_atual: Number(form.estoqueAtual.replace(',', '.')) || 0,
      nome: form.nome.trim(),
      preco: Number(form.preco.replace(',', '.')) || 0,
      unidade: form.unidade.trim() || 'un',
    }

    const query = produtoId
      ? supabase.from('produtos').update(payload).eq('id', produtoId)
      : supabase.from('produtos').insert(payload)

    const { error } = await query

    if (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao salvar produto.'))
      setSalvando(false)
      return
    }

    setSalvando(false)
    onSaved()
  }

  async function excluirProduto() {
    if (!produtoId) {
      return
    }

    const confirmar = window.confirm('Deseja excluir este produto? Essa ação não poderá ser desfeita.')

    if (!confirmar) {
      return
    }

    setErro(null)
    setExcluindo(true)

    const { count, error: referenciaError } = await supabase
      .from('vendas_itens')
      .select('id', { count: 'exact', head: true })
      .eq('produto_id', produtoId)

    if (referenciaError) {
      setErro(getSupabaseErrorMessage(referenciaError, 'Erro ao verificar vínculos do produto.'))
      setExcluindo(false)
      return
    }

    if ((count ?? 0) > 0) {
      setErro('Este produto não pode ser excluído porque já possui registro em vendas.')
      setExcluindo(false)
      return
    }

    const { error: movimentacoesError } = await supabase
      .from('movimentacoes_estoque')
      .delete()
      .eq('produto_id', produtoId)

    if (movimentacoesError) {
      setErro(getSupabaseErrorMessage(movimentacoesError, 'Erro ao remover movimentações do produto.'))
      setExcluindo(false)
      return
    }

    const { data: produtoExcluido, error: deleteError } = await supabase
      .from('produtos')
      .delete()
      .eq('id', produtoId)
      .select('id')
      .maybeSingle()

    if (deleteError) {
      setErro(getSupabaseErrorMessage(deleteError, 'Erro ao excluir produto.'))
      setExcluindo(false)
      return
    }

    if (!produtoExcluido) {
      setErro('O produto não foi excluído. Rode novamente o arquivo `supabase/policies.sql` no Supabase e tente de novo.')
      setExcluindo(false)
      return
    }

    setExcluindo(false)
    onDeleted()
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
            <h1 className="page-title">{produtoId ? 'Editar produto' : 'Novo produto'}</h1>
            <p className="page-subtitle">Mantenha nome, preço e estoque sempre atualizados.</p>
          </div>

          <button type="button" className="secondary-button back-inline-button" onClick={onCancel}>
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        </section>

        {erro && <div className="page-error">{erro}</div>}

        {carregando ? (
          <div className="empty-state">Carregando produto...</div>
        ) : (
          <form className="section-card form-stack" onSubmit={salvarProduto}>
            <div className="field-block">
              <label htmlFor="produto-nome">Nome</label>
              <input
                id="produto-nome"
                className="text-field"
                type="text"
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex: Lenha de Eucalipto"
              />
            </div>

            <div className="field-block">
              <label htmlFor="produto-descricao">Descrição</label>
              <textarea
                id="produto-descricao"
                className="textarea-field"
                value={form.descricao}
                onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                placeholder="Informações adicionais do produto"
              />
            </div>

            <div className="field-grid-two">
              <div className="field-block">
                <label htmlFor="produto-preco">Preço</label>
                <input
                  id="produto-preco"
                  className="text-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco}
                  onChange={(event) => setForm((current) => ({ ...current, preco: event.target.value }))}
                  placeholder="0,00"
                />
              </div>

              <div className="field-block">
                <label htmlFor="produto-unidade">Unidade</label>
                <select
                  id="produto-unidade"
                  className="select-field"
                  value={form.unidade}
                  onChange={(event) => setForm((current) => ({ ...current, unidade: event.target.value }))}
                >
                  <option value="m3">m3</option>
                  <option value="kg">kg</option>
                  <option value="saco">saco</option>
                  <option value="un">un</option>
                </select>
              </div>
            </div>

            <div className="field-grid-two">
              <div className="field-block">
                <label htmlFor="produto-estoque">Estoque atual</label>
                <input
                  id="produto-estoque"
                  className="text-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estoqueAtual}
                  onChange={(event) => setForm((current) => ({ ...current, estoqueAtual: event.target.value }))}
                />
              </div>

              <div className="field-block">
                <label htmlFor="produto-ativo">Status</label>
                <select
                  id="produto-ativo"
                  className="select-field"
                  value={form.ativo ? 'ativo' : 'inativo'}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, ativo: event.target.value === 'ativo' }))
                  }
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            <label className="toggle-pill">
              <input
                type="checkbox"
                checked={form.controlaEstoque}
                onChange={(event) =>
                  setForm((current) => ({ ...current, controlaEstoque: event.target.checked }))
                }
              />
              <span>Controla estoque</span>
            </label>

            <div className="inline-actions">
              {produtoId && (
                <button type="button" className="danger-button" onClick={excluirProduto} disabled={excluindo || salvando}>
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
              <button type="button" className="secondary-button" onClick={onCancel}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={salvando}>
                {salvando ? 'Salvando...' : produtoId ? 'Salvar alterações' : 'Cadastrar produto'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
