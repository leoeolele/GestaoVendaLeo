import {
  ChartNoAxesCombined,
  Download,
  LayoutGrid,
  LogOut,
  Package,
  ReceiptText,
  Truck,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react'
import type { ReactElement } from 'react'
import './SideDrawer.css'

type SideDrawerProps = {
  canInstallApp?: boolean
  open: boolean
  onClose: () => void
  onGoDashboard: () => void
  onGoDashboardCompleto?: () => void
  onGoEstoque: () => void
  onGoNovaVenda: () => void
  onGoPessoas: () => void
  onGoProdutos: () => void
  onGoVendas: () => void
  onInstallApp?: () => void
  onLogout: () => void
  userEmail?: string
}

export function SideDrawer({
  canInstallApp = false,
  open,
  onClose,
  onGoDashboard,
  onGoDashboardCompleto,
  onGoEstoque,
  onGoNovaVenda,
  onGoPessoas,
  onGoProdutos,
  onGoVendas,
  onInstallApp,
  onLogout,
  userEmail,
}: SideDrawerProps) {
  return (
    <div
      className={open ? 'drawer-overlay open' : 'drawer-overlay'}
      onClick={onClose}
      aria-hidden={!open}
    >
      <aside
        className={open ? 'drawer-panel open' : 'drawer-panel'}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="drawer-header">
          <div>
            <strong>LumberLog</strong>
            <p>Gerencie vendas, estoque e clientes.</p>
            {userEmail && <small className="drawer-user-email">{userEmail}</small>}
          </div>

          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </header>

        <nav className="drawer-nav">
          <DrawerLink icon={<LayoutGrid size={18} />} label="Dashboard" onClick={onGoDashboard} />
          {onGoDashboardCompleto && (
            <DrawerLink
              icon={<ChartNoAxesCombined size={18} />}
              label="Painel gerencial"
              onClick={onGoDashboardCompleto}
            />
          )}
          <DrawerLink icon={<UserRoundPlus size={18} />} label="Nova venda" onClick={onGoNovaVenda} />
          <DrawerLink icon={<ReceiptText size={18} />} label="Lista de vendas" onClick={onGoVendas} />
          <DrawerLink icon={<Package size={18} />} label="Produtos" onClick={onGoProdutos} />
          <DrawerLink icon={<Users size={18} />} label="Pessoas" onClick={onGoPessoas} />
          <DrawerLink icon={<Truck size={18} />} label="Estoque" onClick={onGoEstoque} />
        </nav>

        {canInstallApp && onInstallApp && (
          <button type="button" className="drawer-install" onClick={onInstallApp}>
            <Download size={18} />
            <span>Instalar no celular</span>
          </button>
        )}

        <button type="button" className="drawer-logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Sair da conta</span>
        </button>
      </aside>
    </div>
  )
}

type DrawerLinkProps = {
  icon: ReactElement
  label: string
  onClick: () => void
}

function DrawerLink({ icon, label, onClick }: DrawerLinkProps) {
  return (
    <button type="button" className="drawer-link" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </button>
  )
}
