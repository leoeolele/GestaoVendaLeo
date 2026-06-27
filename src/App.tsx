import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './pages/Login'
import { Menu } from './pages/Menu'
import { NovaVenda } from './pages/NovaVenda'

type Tela = 'menu' | 'nova-venda'

function App() {
  const [logado, setLogado] = useState(false)
  const [carregandoSessao, setCarregandoSessao] = useState(true)
  const [tela, setTela] = useState<Tela>('menu')

  useEffect(() => {
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession()

      setLogado(!!data.session)
      setCarregandoSessao(false)
    }

    verificarSessao()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      return
    }

    setTela('menu')
    setLogado(false)
  }

  if (carregandoSessao) {
    return <p>Carregando...</p>
  }

  if (!logado) {
    return <Login onLoginSuccess={() => setLogado(true)} />
  }

  if (tela === 'nova-venda') {
    return (
      <NovaVenda
        onVoltar={() => setTela('menu')}
        onVendaSalva={() => setTela('menu')}
      />
    )
  }

  return (
    <Menu
      onLogout={handleLogout}
      onNovaVenda={() => setTela('nova-venda')}
    />
  )
}

export default App