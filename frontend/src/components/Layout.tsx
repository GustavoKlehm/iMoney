import { useLocation } from 'react-router-dom';
import { AnimatedOutlet } from './AnimatedOutlet';
import { AppLogo } from './AppLogo';
import { BackLink } from './BackLink';
import { ConfirmProvider } from './ConfirmProvider';
import { GlassNav } from './GlassNav';
import { usesPageToolbar } from './PageToolbar';
import { UserMenu } from './UserMenu';
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
  const { pathname } = useLocation();
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

        <div className="header-controls">
          <GlassNav items={navItems} aria-label="Navegação principal" className="header-nav" />
          <UserMenu
            user={user}
            onSignOut={() => {
              void signOut().catch(() => undefined);
            }}
          />
        </div>
      </header>

      <main className="main">
        <ConfirmProvider>
          <BackLink
            className={usesPageToolbar(pathname) ? 'back-link--page-toolbar' : undefined}
          />
          <AnimatedOutlet />
        </ConfirmProvider>
      </main>
    </div>
  );
}
