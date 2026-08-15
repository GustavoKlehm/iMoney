import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import './PageToolbar.css';

const PAGE_TOOLBAR_EXACT = new Set([
  '/lancamentos',
  '/cadastros',
  '/contas',
  '/categorias',
  '/planejamentos',
  '/objetivos',
]);

const PAGE_TOOLBAR_PREFIXES = [
  '/planejamentos/',
  '/objetivos/',
];

export function usesPageToolbar(pathname: string): boolean {
  if (PAGE_TOOLBAR_EXACT.has(pathname)) return true;
  return PAGE_TOOLBAR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export type PageToolbarAction = {
  label: string;
  to?: string;
  onClick?: () => void;
  expanded?: boolean;
  controls?: string;
};

export type PageToolbarProps = {
  title: string;
  subtitle?: string;
  titleAddon?: ReactNode;
  backTo: string;
  backLabel?: string;
  action?: PageToolbarAction;
  desktopExtra?: ReactNode;
};

function ChevronIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
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
    <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
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

function ActionControl({
  action,
  className,
  iconOnly,
}: {
  action: PageToolbarAction;
  className: string;
  iconOnly: boolean;
}) {
  const content = iconOnly ? <PlusIcon /> : action.label;
  const ariaLabel = iconOnly ? action.label : undefined;

  if (action.to) {
    return (
      <Link to={action.to} className={className} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={action.onClick}
      aria-label={ariaLabel}
      aria-expanded={action.expanded}
      aria-controls={action.controls}
    >
      {content}
    </button>
  );
}

export function PageToolbar({
  title,
  subtitle,
  titleAddon,
  backTo,
  backLabel = 'Voltar',
  action,
  desktopExtra,
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
          <ActionControl
            action={action}
            className="page-toolbar__icon-btn liquid-glass"
            iconOnly
          />
        ) : (
          <span className="page-toolbar__icon-spacer" aria-hidden="true" />
        )}
      </div>

      <div className="page-toolbar__desktop page-header">
        <div>
          <h1>
            {title}
            {titleAddon}
          </h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </div>
        {(desktopExtra || action) && (
          <div className="page-toolbar__desktop-actions">
            {desktopExtra}
            {action && (
              <ActionControl action={action} className="btn-primary" iconOnly={false} />
            )}
          </div>
        )}
      </div>

      {subtitle && (
        <p className="page-toolbar__compact-subtitle subtitle">{subtitle}</p>
      )}
    </header>
  );
}
