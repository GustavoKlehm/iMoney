import { Link } from 'react-router-dom';
import './PageToolbar.css';

const ROUTES_WITH_PAGE_TOOLBAR = new Set(['/lancamentos']);

export function usesPageToolbar(pathname: string): boolean {
  return ROUTES_WITH_PAGE_TOOLBAR.has(pathname);
}

export type PageToolbarAction = {
  to: string;
  label: string;
};

export type PageToolbarProps = {
  title: string;
  subtitle?: string;
  backTo: string;
  backLabel?: string;
  action?: PageToolbarAction;
};

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M10.25 3.5 5.75 8l4.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        d="M9 4.5v9M4.5 9h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageToolbar({
  title,
  subtitle,
  backTo,
  backLabel = 'Voltar',
  action,
}: PageToolbarProps) {
  return (
    <header className="page-toolbar">
      <div className="page-toolbar__compact" aria-label={title}>
        <Link
          to={backTo}
          className="page-toolbar__icon-btn liquid-glass"
          aria-label={backLabel}
        >
          <ChevronIcon />
        </Link>
        <h1 className="page-toolbar__title">{title}</h1>
        {action ? (
          <Link
            to={action.to}
            className="page-toolbar__icon-btn liquid-glass"
            aria-label={action.label}
          >
            <PlusIcon />
          </Link>
        ) : (
          <span className="page-toolbar__icon-spacer" aria-hidden="true" />
        )}
      </div>

      <div className="page-toolbar__desktop page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {action && (
          <Link to={action.to} className="btn-primary">
            {action.label}
          </Link>
        )}
      </div>

      {subtitle && (
        <p className="page-toolbar__compact-subtitle subtitle">{subtitle}</p>
      )}
    </header>
  );
}
