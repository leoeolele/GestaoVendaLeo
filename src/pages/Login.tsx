import { useState } from 'react'
import type { FormEvent } from 'react'
import { Download, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './Login.css'

type LoginProps = {
  canInstallApp?: boolean
  onInstallApp?: () => void
  onLoginSuccess: () => void
}

export function Login({ canInstallApp = false, onInstallApp, onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function entrar(event: FormEvent) {
    event.preventDefault()

    setErro('')
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }

    onLoginSuccess()
  }

  return (
    <main className="login-page">
      <header className="login-header">
        <strong className="logo">LumberLog</strong>
        <button className="header-icon" type="button" aria-label="Menu">
          <LogIn size={14} />
        </button>
      </header>

      <section className="login-intro">
        <h1>Bem-vindo de volta</h1>
        <p>Entre com seu e-mail e senha do Supabase para usar o app no navegador ou no celular.</p>
      </section>

      <section className="login-card">
        <form onSubmit={entrar}>
          <label className="field-label" htmlFor="email">
            E-mail
          </label>

          <div className="input-wrapper">
            <span className="input-icon">@</span>
            <input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <label className="field-label" htmlFor="senha">
            Senha
          </label>

          <div className="input-wrapper">
            <span className="input-icon">#</span>
            <input
              id="senha"
              type={mostrarSenha ? 'text' : 'password'}
              placeholder="••••••••"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />

            <button
              className="show-password"
              type="button"
              onClick={() => setMostrarSenha((valorAtual) => !valorAtual)}
              aria-label="Mostrar ou ocultar senha"
            >
              {mostrarSenha ? 'Ocultar' : 'Ver'}
            </button>
          </div>

          {erro && <p className="error-message">{erro}</p>}

          <button className="login-button" type="submit" disabled={carregando}>
            <LogIn size={16} />
            <span>{carregando ? 'Entrando...' : 'Entrar'}</span>
          </button>
        </form>

        {canInstallApp && onInstallApp && (
          <button className="install-button" type="button" onClick={onInstallApp}>
            <Download size={16} />
            <span>Instalar app</span>
          </button>
        )}
      </section>

      <footer className="login-footer">
        <p>LumberLog Pro © 2026. Para trocar de conta, abra o menu e use "Sair da conta".</p>
        <div className="wood-illustration" aria-hidden="true">
          ● ● ●<br />
          ● ● ● ●<br />
          ● ● ●
        </div>
      </footer>
    </main>
  )
}
