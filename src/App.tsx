import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './pages/Login'
import { Menu } from './pages/Menu'
import { NovaVenda } from './pages/NovaVenda'
import { Produtos } from './pages/Produtos'
import { ProdutoForm } from './pages/ProdutoForm'
import { Pessoas } from './pages/Pessoas'
import { PessoaForm } from './pages/PessoaForm'
import { ListaVendas } from './pages/ListaVendas'
import { Estoque } from './pages/Estoque'
import { DashboardCompleto } from './pages/DashboardCompleto'
import { SideDrawer } from './components/SideDrawer'
import { PrivacyProvider } from './contexts/PrivacyProvider'
import './App.css'
import './styles/ui.css'

type Tela =
  | { name: 'menu' }
  | { name: 'nova-venda'; vendaId?: string }
  | { name: 'dashboard-completo' }
  | { name: 'lista-vendas' }
  | { name: 'produtos' }
  | { name: 'produto-form'; produtoId?: string }
  | { name: 'pessoas' }
  | { name: 'pessoa-form'; pessoaId?: string }
  | { name: 'estoque' }

function App() {
  const [canInstallApp, setCanInstallApp] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [logado, setLogado] = useState(false)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [tela, setTela] = useState<Tela>({ name: 'menu' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession()

      setLogado(!!data.session)
      setUserEmail(data.session?.user.email ?? '')
      setCarregandoSessao(false)
    }

    verificarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session)
      setUserEmail(session?.user.email ?? '')
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault()
      setDeferredPrompt(event)
      setCanInstallApp(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      return
    }

    setTela({ name: 'menu' })
    setDrawerOpen(false)
    setLogado(false)
    setUserEmail('')
  }

  async function handleInstallApp() {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setCanInstallApp(false)
  }

  function navegarProDashboard() {
    setTela({ name: 'menu' })
    setDrawerOpen(false)
  }

  function navegarParaVendas() {
    setTela({ name: 'lista-vendas' })
    setDrawerOpen(false)
  }

  function navegarParaDashboardCompleto() {
    setTela({ name: 'dashboard-completo' })
    setDrawerOpen(false)
  }

  function navegarParaProdutos() {
    setTela({ name: 'produtos' })
    setDrawerOpen(false)
  }

  function navegarParaPessoas() {
    setTela({ name: 'pessoas' })
    setDrawerOpen(false)
  }

  function navegarParaNovaVenda(vendaId?: string) {
    setTela(vendaId ? { name: 'nova-venda', vendaId } : { name: 'nova-venda' })
    setDrawerOpen(false)
  }

  function navegarParaEstoque() {
    setTela({ name: 'estoque' })
    setDrawerOpen(false)
  }

  function atualizarDados() {
    setRefreshToken((current) => current + 1)
  }

  if (carregandoSessao) {
    return (
      <PrivacyProvider>
        <p className="loading">Carregando...</p>
      </PrivacyProvider>
    )
  }

  if (!logado) {
    return (
      <PrivacyProvider>
        <Login
          canInstallApp={canInstallApp}
          onInstallApp={handleInstallApp}
          onLoginSuccess={() => setLogado(true)}
        />
      </PrivacyProvider>
    )
  }

  let paginaAtual: ReactElement

  switch (tela.name) {
    case 'nova-venda':
      paginaAtual = (
        <NovaVenda
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          onRefreshData={atualizarDados}
          onVendaSalva={() => {
            atualizarDados()
            navegarParaVendas()
          }}
          vendaId={tela.vendaId}
        />
      )
      break

    case 'dashboard-completo':
      paginaAtual = (
        <DashboardCompleto
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          refreshToken={refreshToken}
        />
      )
      break

    case 'lista-vendas':
      paginaAtual = (
        <ListaVendas
          onEditarVenda={(vendaId) => navegarParaNovaVenda(vendaId)}
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onNovaVenda={navegarParaNovaVenda}
          onOpenMenu={() => setDrawerOpen(true)}
          onRefreshData={atualizarDados}
          refreshToken={refreshToken}
        />
      )
      break

    case 'produtos':
      paginaAtual = (
        <Produtos
          onAdicionarProduto={() => setTela({ name: 'produto-form' })}
          onEditarProduto={(produtoId) => setTela({ name: 'produto-form', produtoId })}
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          refreshToken={refreshToken}
        />
      )
      break

    case 'produto-form':
      paginaAtual = (
        <ProdutoForm
          onCancel={navegarParaProdutos}
          onDeleted={() => {
            atualizarDados()
            navegarParaProdutos()
          }}
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          onSaved={() => {
            atualizarDados()
            navegarParaProdutos()
          }}
          produtoId={tela.produtoId}
        />
      )
      break

    case 'pessoas':
      paginaAtual = (
        <Pessoas
          onAdicionarPessoa={() => setTela({ name: 'pessoa-form' })}
          onEditarPessoa={(pessoaId) => setTela({ name: 'pessoa-form', pessoaId })}
          onGoMenu={navegarProDashboard}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          refreshToken={refreshToken}
        />
      )
      break

    case 'pessoa-form':
      paginaAtual = (
        <PessoaForm
          onCancel={navegarParaPessoas}
          onDeleted={() => {
            atualizarDados()
            navegarParaPessoas()
          }}
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          onSaved={() => {
            atualizarDados()
            navegarParaPessoas()
          }}
          pessoaId={tela.pessoaId}
        />
      )
      break

    case 'estoque':
      paginaAtual = (
        <Estoque
          onGoMenu={navegarProDashboard}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onOpenMenu={() => setDrawerOpen(true)}
          onRefreshData={atualizarDados}
          refreshToken={refreshToken}
        />
      )
      break

    case 'menu':
    default:
      paginaAtual = (
        <Menu
          onEditarVenda={(vendaId) => navegarParaNovaVenda(vendaId)}
          onGoDashboardCompleto={navegarParaDashboardCompleto}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onNovaVenda={() => navegarParaNovaVenda()}
          onOpenMenu={() => setDrawerOpen(true)}
          refreshToken={refreshToken}
        />
      )
  }

  return (
    <PrivacyProvider>
      <>
        {paginaAtual}

        <SideDrawer
          canInstallApp={canInstallApp}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onGoDashboard={navegarProDashboard}
          onGoDashboardCompleto={navegarParaDashboardCompleto}
          onGoEstoque={navegarParaEstoque}
          onGoNovaVenda={navegarParaNovaVenda}
          onGoPessoas={navegarParaPessoas}
          onGoProdutos={navegarParaProdutos}
          onGoVendas={navegarParaVendas}
          onInstallApp={handleInstallApp}
          onLogout={handleLogout}
          userEmail={userEmail}
        />
      </>
    </PrivacyProvider>
  )
}

export default App
