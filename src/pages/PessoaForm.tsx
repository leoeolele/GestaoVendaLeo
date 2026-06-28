import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppShell } from '../components/AppShell'
import { getSupabaseErrorMessage } from '../lib/supabaseErrors'
import './PessoaForm.css'

type PessoaFormProps = {
  onCancel: () => void
  onDeleted: () => void
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
  onSaved: () => void
  pessoaId?: string
}

type PessoaTipoOption = {
  id: string
  nome: string
}

type FormState = {
  ativo: boolean
  endereco: string
  nome: string
  observacao: string
  telefone: string
  tipoId: string
}

const initialState: FormState = {
  ativo: true,
  endereco: '',
  nome: '',
  observacao: '',
  telefone: '',
  tipoId: '',
}

export function PessoaForm({
  onCancel,
  onDeleted,
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
  onSaved,
  pessoaId,
}: PessoaFormProps) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState<FormState>(initialState)
  const [tipos, setTipos] = useState<PessoaTipoOption[]>([])

  useEffect(() => {
    async function carregarFormulario() {
      setCarregando(true)
      setErro(null)

      const { data: tiposData, error: tiposError } = await supabase
        .from('pessoas_tipos')
        .select('id, nome')
        .order('nome', { ascending: true })

      if (tiposError) {
        setErro(getSupabaseErrorMessage(tiposError, 'Erro ao carregar tipos de pessoa.'))
        setCarregando(false)
        return
      }

      const tiposList = (tiposData ?? []) as PessoaTipoOption[]
      setTipos(tiposList)

      if (!pessoaId) {
        setForm({
          ...initialState,
          tipoId: tiposList[0]?.id ?? '',
        })
        setCarregando(false)
        return
      }

      const { data: pessoaData, error: pessoaError } = await supabase
        .from('pessoas')
        .select('id, tipo_id, nome, telefone, endereco, observacao, ativo')
        .eq('id', pessoaId)
        .single()

      if (pessoaError) {
        setErro(getSupabaseErrorMessage(pessoaError, 'Erro ao carregar pessoa.'))
        setCarregando(false)
        return
      }

      setForm({
        ativo: Boolean(pessoaData.ativo),
        endereco: pessoaData.endereco ?? '',
        nome: pessoaData.nome ?? '',
        observacao: pessoaData.observacao ?? '',
        telefone: pessoaData.telefone ?? '',
        tipoId: pessoaData.tipo_id ?? tiposList[0]?.id ?? '',
      })
      setCarregando(false)
    }

    carregarFormulario()
  }, [pessoaId])

  async function salvarPessoa(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)

    if (!form.nome.trim()) {
      setErro('Informe o nome da pessoa.')
      return
    }

    if (!form.tipoId) {
      setErro('Selecione o tipo da pessoa.')
      return
    }

    setSalvando(true)

    const payload = {
      ativo: form.ativo,
      endereco: form.endereco.trim() || null,
      nome: form.nome.trim(),
      observacao: form.observacao.trim() || null,
      telefone: form.telefone.trim() || null,
      tipo_id: form.tipoId,
    }

    const query = pessoaId
      ? supabase.from('pessoas').update(payload).eq('id', pessoaId)
      : supabase.from('pessoas').insert(payload)

    const { error } = await query

    if (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao salvar pessoa.'))
      setSalvando(false)
      return
    }

    setSalvando(false)
    onSaved()
  }

  async function excluirPessoa() {
    if (!pessoaId) {
      return
    }

    const confirmar = window.confirm('Deseja excluir esta pessoa? Essa ação não poderá ser desfeita.')

    if (!confirmar) {
      return
    }

    setErro(null)
    setExcluindo(true)

    const { count, error: referenciaError } = await supabase
      .from('vendas')
      .select('id', { count: 'exact', head: true })
      .eq('pessoa_id', pessoaId)

    if (referenciaError) {
      setErro(getSupabaseErrorMessage(referenciaError, 'Erro ao verificar vínculos da pessoa.'))
      setExcluindo(false)
      return
    }

    if ((count ?? 0) > 0) {
      setErro('Esta pessoa não pode ser excluída porque já possui registro em vendas.')
      setExcluindo(false)
      return
    }

    const { error } = await supabase
      .from('pessoas')
      .delete()
      .eq('id', pessoaId)

    if (error) {
      setErro(getSupabaseErrorMessage(error, 'Erro ao excluir pessoa.'))
      setExcluindo(false)
      return
    }

    setExcluindo(false)
    onDeleted()
  }

  return (
    <AppShell
      activeNav="pessoas"
      onGoMenu={onGoMenu}
      onGoPessoas={onGoPessoas}
      onGoProdutos={onGoProdutos}
      onGoVendas={onGoVendas}
      onOpenMenu={onOpenMenu}
    >
      <div className="page-stack">
        <section className="page-hero">
          <div>
            <h1 className="page-title">{pessoaId ? 'Editar pessoa' : 'Nova pessoa'}</h1>
            <p className="page-subtitle">Cadastre clientes, fornecedores e equipe com o mesmo padrão.</p>
          </div>

          <button type="button" className="secondary-button back-inline-button" onClick={onCancel}>
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        </section>

        {erro && <div className="page-error">{erro}</div>}

        {carregando ? (
          <div className="empty-state">Carregando formulário...</div>
        ) : (
          <form className="section-card form-stack" onSubmit={salvarPessoa}>
            <div className="field-block">
              <label htmlFor="pessoa-tipo">Tipo</label>
              <select
                id="pessoa-tipo"
                className="select-field"
                value={form.tipoId}
                onChange={(event) => setForm((current) => ({ ...current, tipoId: event.target.value }))}
              >
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <label htmlFor="pessoa-nome">Nome</label>
              <input
                id="pessoa-nome"
                className="text-field"
                type="text"
                value={form.nome}
                onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex: João da Silva"
              />
            </div>

            <div className="field-grid-two">
              <div className="field-block">
                <label htmlFor="pessoa-telefone">Telefone</label>
                <input
                  id="pessoa-telefone"
                  className="text-field"
                  type="text"
                  value={form.telefone}
                  onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="field-block">
                <label htmlFor="pessoa-status">Status</label>
                <select
                  id="pessoa-status"
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

            <div className="field-block">
              <label htmlFor="pessoa-endereco">Endereço</label>
              <input
                id="pessoa-endereco"
                className="text-field"
                type="text"
                value={form.endereco}
                onChange={(event) => setForm((current) => ({ ...current, endereco: event.target.value }))}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="field-block">
              <label htmlFor="pessoa-observacao">Observação</label>
              <textarea
                id="pessoa-observacao"
                className="textarea-field"
                value={form.observacao}
                onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))}
                placeholder="Anotações úteis sobre este cadastro"
              />
            </div>

            <div className="inline-actions">
              {pessoaId && (
                <button type="button" className="danger-button" onClick={excluirPessoa} disabled={excluindo || salvando}>
                  {excluindo ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
              <button type="button" className="secondary-button" onClick={onCancel}>
                Cancelar
              </button>
              <button type="submit" className="primary-button" disabled={salvando}>
                {salvando ? 'Salvando...' : pessoaId ? 'Salvar alterações' : 'Cadastrar pessoa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  )
}
