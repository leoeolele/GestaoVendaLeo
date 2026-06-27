import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import './Login.css'

type LoginProps = {
  onLoginSuccess: () => void
}

export function Login({ onLoginSuccess }: LoginProps) {
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
          ▣
        </button>
      </header>

      <section className="login-intro">
        <h1>Bem-vindo de volta</h1>
        <p>Gerencie suas vendas de lenha com praticidade e eficiência.</p>
      </section>

      <section className="login-card">
        <form onSubmit={entrar}>
          <label className="field-label" htmlFor="email">
            E-mail
          </label>

          <div className="input-wrapper">
            <span className="input-icon">✉</span>
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
            <span className="input-icon">▣</span>
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
              ◉
            </button>
          </div>

          {erro && <p className="error-message">{erro}</p>}

          <button className="login-button" type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'} <span>➜</span>
          </button>
        </form>

      </section>

      <footer className="login-footer">
        <p>LumberLog Pro © 2026. Ferramentas para o campo.</p>
        <div className="wood-illustration" aria-hidden="true">
          ● ● ●<br />
          ● ● ● ●<br />
          ● ● ●
        </div>
      </footer>
    </main>
  )
}