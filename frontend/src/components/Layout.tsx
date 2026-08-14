import { AnimatedOutlet } from './AnimatedOutlet';
import { AppLogo } from './AppLogo';
import { BackLink } from './BackLink';
import { ConfirmProvider } from './ConfirmProvider';
import { GlassNav } from './GlassNav';
import { WallpaperBackground } from './WallpaperBackground';
import { useAuth } from '../auth/AuthProvider';
import './Layout.css';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/lancamentos', label: 'Lançamentos' },
  {
    to: '/cadastros',
    label: 'Cadastros',
    matchPrefix: ['/cadastros', '/contas', '/categorias', '/planejamentos', '/objetivos'],
  },
];

export function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="layout">
      <WallpaperBackground />

      <header className="header liquid-glass-bar">
        <div className="header-brand">
          <AppLogo size="sm" />
          <div className="header-brand__text">
            <span className="logo">iMoney</span>
            <span className="tagline">Controle financeiro do casal</span>
          </div>
        </div>
        <div className="header-actions">
          <GlassNav items={navItems} aria-label="Navegação principal" />
          <div className="header-session">
            <span className="header-session__email">{user?.email}</span>
            <button
              className="header-session__sign-out"
              type="button"
              onClick={() => {
                void signOut().catch(() => undefined);
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <ConfirmProvider>
          <BackLink />
          <AnimatedOutlet />
        </ConfirmProvider>
      </main>
    </div>
  );
}
