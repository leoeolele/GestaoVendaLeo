import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Login } from './pages/Login'
import { Menu } from './pages/Menu'
import './App.css'

function App() {
  const [logado, setLogado] = useState(false)
  const [carregandoSessao, setCarregandoSessao] = useState(true)

  useEffect(() => {
    async function carregarSessao() {
      const { data } = await supabase.auth.getSession()

      setLogado(!!data.session)
      setCarregandoSessao(false)
    }

    carregarSessao()

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogado(!!session)
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  async function sair() {
    await supabase.auth.signOut()
    setLogado(false)
  }

  if (carregandoSessao) {
    return <p className="loading">Carregando...</p>
  }

  if (!logado) {
    return <Login onLoginSuccess={() => setLogado(true)} />
  }

  return <Menu onLogout={sair} />
}

export default App