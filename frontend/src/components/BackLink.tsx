import { Link, useLocation } from 'react-router-dom';
import './BackLink.css';

function parentPath(pathname: string): string | null {
  if (pathname === '/') return null;
  if (pathname === '/lancamentos' || pathname === '/cadastros') return '/';
  if (pathname.startsWith('/lancamentos/')) return '/lancamentos';
  if (
    pathname === '/contas'
    || pathname === '/categorias'
    || pathname === '/planejamentos'
    || pathname === '/objetivos'
  ) {
    return '/cadastros';
  }
  if (pathname.startsWith('/planejamentos/')) return '/planejamentos';
  if (pathname.startsWith('/objetivos/')) return '/objetivos';
  return '/';
}

export function BackLink() {
  const { pathname } = useLocation();
  const to = parentPath(pathname);
  if (!to) return null;

  return (
    <Link to={to} className="back-link liquid-glass">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M10.25 3.5 5.75 8l4.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Voltar</span>
    </Link>
  );
}
