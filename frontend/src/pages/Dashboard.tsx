import { useQuery } from '@tanstack/react-query';
import { api, type PaceStatus } from '../api/client';
import { LiquidProgress } from '../components/LiquidProgress';
import { PageLoading } from '../components/PageLoading';
import { formatCurrency, getCurrentPeriod, MONTH_NAMES, PACE_STATUS_LABELS } from '../utils/format';
import './Dashboard.css';

function paceVariant(status: PaceStatus | null): 'default' | 'success' | 'warning' | 'danger' {
  if (status === null) return 'default';
  if (status === 'warning') return 'warning';
  if (status === 'over_pace' || status === 'over_limit') return 'danger';
  return 'success';
}

export function DashboardPage() {
  const { year, month } = getCurrentPeriod();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', year, month],
    queryFn: () => api.dashboard(year, month),
  });

  if (isLoading) return <PageLoading message="Carregando dashboard..." />;
  if (error) return <div className="page-error">Erro ao carregar: {(error as Error).message}</div>;
  if (!data) return null;

  const goals = data.activePlans;
  const budgetItems = data.budgetProgress.filter((item) => item.limit > 0 || item.spent > 0);
  const hasPlans = goals.length > 0;
  const hasAccounts = data.accountBalances.length > 0;
  const hasBudget = budgetItems.length > 0;
  const showPriority = hasPlans || hasAccounts;

  return (
    <div className="dashboard">
      <header className="page-header page-header--compact">
        <h1>Dashboard</h1>
        <p className="subtitle">{MONTH_NAMES[month - 1]} de {year}</p>
      </header>

      <section className="hero-balance glass-module" aria-label="Saldo livre">
        <span className="hero-balance__label">Saldo livre</span>
        <span className="hero-balance__value">{formatCurrency(data.summary.freeBalance)}</span>
      </section>

      {showPriority && (
        <div className={`priority-row${hasPlans && hasAccounts ? ' priority-row--split' : ''}`}>
          {hasPlans && (
            <section className="priority-panel glass-module" aria-labelledby="metas-heading">
              <h2 id="metas-heading" className="panel-title">Metas</h2>
              <ul className="compact-list">
                {goals.map((plan) => (
                  <li key={plan.id} className="compact-item">
                    <div className="compact-item__head">
                      <span className="compact-item__name">{plan.name}</span>
                      <span className="compact-item__pct">{Math.round(plan.progress)}%</span>
                    </div>
                    <LiquidProgress
                      value={plan.progress}
                      variant="success"
                      size="thin"
                      label={`Meta ${plan.name}: ${Math.round(plan.progress)}%`}
                    />
                    <p className="compact-item__meta">
                      {formatCurrency(plan.currentAmount)} / {formatCurrency(plan.targetAmount)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasAccounts && (
            <section className="priority-panel glass-module" aria-labelledby="contas-heading">
              <h2 id="contas-heading" className="panel-title">Contas</h2>
              <ul className="compact-list compact-list--accounts">
                {data.accountBalances.map((account) => (
                  <li key={account.id} className="compact-item compact-item--row">
                    <span className="compact-item__name">
                      {account.name}
                      {account.isReserved && <span className="badge">Reservada</span>}
                    </span>
                    <span className={`compact-item__amount ${account.balance! >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(account.balance ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <section className="glass-module metrics-module" aria-label="Resumo do mês">
        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">Saldo total</span>
            <span className="metric-value">{formatCurrency(data.summary.totalBalance)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Reservado</span>
            <span className="metric-value muted">{formatCurrency(data.summary.reservedTotal)}</span>
          </div>
          <div className="metric-card income">
            <span className="metric-label">Receitas</span>
            <span className="metric-value">{formatCurrency(data.summary.income)}</span>
          </div>
          <div className="metric-card expense">
            <span className="metric-label">Despesas</span>
            <span className="metric-value">{formatCurrency(data.summary.expenses)}</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Resultado</span>
            <span className={`metric-value ${data.summary.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(data.summary.balance)}
            </span>
          </div>
        </div>
      </section>

      {hasBudget && (
        <section className="section budget-section" aria-labelledby="budget-heading">
          <h2 id="budget-heading" className="section-title">Orçamento por categoria</h2>
          <div className="budget-grid">
            {budgetItems.map((item) => (
              <article
                key={item.category.id}
                className={`budget-item${item.paceStatus ? ` budget-item--${item.paceStatus}` : ''}`}
              >
                <div className="budget-header">
                  <div className="budget-title">
                    <span className="budget-name">{item.category.name}</span>
                    {item.paceStatus && (
                      <span className={`pace-badge pace-badge--header pace-badge--${item.paceStatus}`}>
                        {PACE_STATUS_LABELS[item.paceStatus]}
                      </span>
                    )}
                  </div>
                  <span className="budget-amounts">
                    {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                  </span>
                </div>
                <LiquidProgress
                  value={item.percent}
                  variant={paceVariant(item.paceStatus)}
                  size="thin"
                  label={`Orçamento ${item.category.name}: ${item.percent}% usado`}
                />
                <div className="budget-footer">
                  <span>{item.percent}%</span>
                  <span>Restam {formatCurrency(item.remaining)}</span>
                  {item.paceStatus && (
                    <span className={`pace-badge pace-badge--footer pace-badge--${item.paceStatus}`}>
                      {PACE_STATUS_LABELS[item.paceStatus]}
                    </span>
                  )}
                </div>
                <p className="budget-pace-detail">
                  Esperado até hoje: {formatCurrency(item.expectedToDate)}
                  {(item.paceStatus === 'over_pace' || item.paceStatus === 'over_limit') && (
                    <> · Projeção: {formatCurrency(item.projected)}</>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="hero-balance hero-balance--projected glass-module" aria-label="Saldo projetado">
        <span className="hero-balance__label">Saldo projetado</span>
        <span className={`hero-balance__value${data.summary.projectedFreeBalance < 0 ? ' negative' : ''}`}>
          {formatCurrency(data.summary.projectedFreeBalance)}
        </span>
        <p className="hero-balance__hint">
          Livre {formatCurrency(data.summary.freeBalance)}
          {' − '}
          limites {formatCurrency(data.summary.plannedLimits)}
          {' − '}
          sem plano {formatCurrency(data.summary.unplannedExpenses)}
        </p>
      </section>
    </div>
  );
}
