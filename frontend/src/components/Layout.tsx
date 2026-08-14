import { AnimatedOutlet } from './AnimatedOutlet';
import { AppLogo } from './AppLogo';
import { GlassNav } from './GlassNav';
import { WallpaperBackground } from './WallpaperBackground';
import './Layout.css';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/lancamentos/novo', label: '+ Gasto' },
  { to: '/categorias', label: 'Categorias' },
];

export function Layout() {
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
        <GlassNav items={navItems} aria-label="Navegação principal" />
      </header>

      <main className="main">
        <AnimatedOutlet />
      </main>
    </div>
  );
}
