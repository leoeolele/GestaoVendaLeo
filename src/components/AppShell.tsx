import type { ReactNode } from 'react'
import { Eye, EyeOff, LayoutGrid, Menu, Package, ReceiptText, UserRound, Users } from 'lucide-react'
import { usePrivacy } from '../contexts/usePrivacy'
import './AppShell.css'

type ActiveNav = 'menu' | 'vendas' | 'produtos' | 'pessoas'

type AppShellProps = {
  activeNav: ActiveNav
  children: ReactNode
  headerAction?: ReactNode
  onGoMenu: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onOpenMenu: () => void
}

export function AppShell({
  activeNav,
  children,
  headerAction,
  onGoMenu,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onOpenMenu,
}: AppShellProps) {
  const { toggleValuesHidden, valuesHidden } = usePrivacy()

  return (
    <main className="app-shell-page">
      <div className="app-shell-frame">
        <header className="app-shell-topbar">
          <button
            type="button"
            className="icon-button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </button>

          <strong className="app-shell-brand">LumberLog</strong>

          <div className="app-shell-action">
            {headerAction ?? (
              <>
                <button
                  type="button"
                  className="icon-button header-privacy-button"
                  onClick={toggleValuesHidden}
                  aria-label={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
                  title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
                >
                  {valuesHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <div className="header-avatar" aria-hidden="true">
                  <UserRound size={16} />
                </div>
              </>
            )}
          </div>
        </header>

        <section className="app-shell-content">{children}</section>

        <nav className="app-shell-bottom-nav">
          <button
            type="button"
            className={activeNav === 'menu' ? 'bottom-nav-link active' : 'bottom-nav-link'}
            onClick={onGoMenu}
          >
            <LayoutGrid size={18} />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={activeNav === 'vendas' ? 'bottom-nav-link active' : 'bottom-nav-link'}
            onClick={onGoVendas}
          >
            <ReceiptText size={18} />
            <span>Vendas</span>
          </button>

          <button
            type="button"
            className={activeNav === 'produtos' ? 'bottom-nav-link active' : 'bottom-nav-link'}
            onClick={onGoProdutos}
          >
            <Package size={18} />
            <span>Produtos</span>
          </button>

          <button
            type="button"
            className={activeNav === 'pessoas' ? 'bottom-nav-link active' : 'bottom-nav-link'}
            onClick={onGoPessoas}
          >
            <Users size={18} />
            <span>Pessoas</span>
          </button>
        </nav>
      </div>
    </main>
  )
}

export type { ActiveNav }
