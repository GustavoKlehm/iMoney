import { useDeferredValue, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Transaction } from '../api/client';
import { AppLogo } from '../components/AppLogo';
import { ItemActions, type ItemActionsHandle } from '../components/ItemActions';
import { MoneyInput } from '../components/MoneyInput';
import { PageToolbar } from '../components/PageToolbar';
import { PageLoading } from '../components/PageLoading';
import { Select } from '../components/Select';
import { useConfirm } from '../components/ConfirmProvider';
import { transactionRemovalCopy } from '../utils/confirmRemoval';
import {
  formatCurrency,
  formatDateTime,
  getCurrentPeriod,
  TRANSACTION_TYPE_LABELS,
} from '../utils/format';
import { sortByName } from '../utils/sortByName';
import './Transactions.css';

const COMPACT_QUERY = '(max-width: 767px)';

type PanelFilters = {
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  minAmount: number;
  maxAmount: number;
};

function emptyPanelFilters(): PanelFilters {
  return {
    categoryId: '',
    dateFrom: '',
    dateTo: '',
    minAmount: 0,
    maxAmount: 0,
  };
}

function readPanelFromSearch(params: URLSearchParams): PanelFilters {
  const minRaw = params.get('min');
  const maxRaw = params.get('max');
  const minAmount = minRaw && Number.isFinite(Number(minRaw)) ? Number(minRaw) : 0;
  const maxAmount = maxRaw && Number.isFinite(Number(maxRaw)) ? Number(maxRaw) : 0;
  return {
    categoryId: params.get('categoria') ?? '',
    dateFrom: params.get('de') ?? '',
    dateTo: params.get('ate') ?? '',
    minAmount,
    maxAmount,
  };
}

function countActivePanelFilters(filters: PanelFilters): number {
  let count = 0;
  if (filters.categoryId) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  if (filters.minAmount > 0 || filters.maxAmount > 0) count += 1;
  return count;
}

function useCompactLayout() {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_QUERY).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return compact;
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="m16.2 16.2 4.3 4.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 5.5h16l-6.2 7.2v4.8L10.2 19v-6.3L4 5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TransactionRowProps {
  tx: Transaction;
  compact: boolean;
  removing: boolean;
  onEdit: (id: string) => void;
  onRemove: (tx: Transaction) => void;
}

function TransactionRow({ tx, compact, removing, onEdit, onRemove }: TransactionRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const actionsRef = useRef<ItemActionsHandle>(null);

  function openActions() {
    actionsRef.current?.toggle();
  }

  return (
    <li
      ref={rowRef}
      className={`transaction-row ${tx.type.toLowerCase()} ${tx.isCancelled ? 'cancelled' : ''} ${compact ? 'transaction-row--compact' : ''}`}
      onClick={compact ? openActions : undefined}
      onKeyDown={
        compact
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openActions();
              }
            }
          : undefined
      }
      role={compact ? 'button' : undefined}
      tabIndex={compact ? 0 : undefined}
      aria-haspopup={compact ? 'menu' : undefined}
      aria-label={compact ? `Ações de ${tx.description}` : undefined}
    >
      <div className="tx-main">
        <span className="tx-desc">
          {tx.description}
          {tx.isOpeningBalance && <span className="tx-badge">Saldo inicial</span>}
        </span>
        <span className="tx-meta">
          {tx.type === 'TRANSFER'
            ? `${tx.account?.name ?? 'Conta de origem'} → ${tx.toAccount?.name ?? 'Conta de destino'}`
            : tx.category?.name ?? TRANSACTION_TYPE_LABELS[tx.type]}
        </span>
      </div>
      <div className="tx-values">
        <span className={`tx-amount ${tx.type.toLowerCase()}`}>
          {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '−' : ''}
          {formatCurrency(Number(tx.amount))}
        </span>
        <time className="tx-date" dateTime={tx.date}>
          {formatDateTime(tx.date)}
        </time>
      </div>
      <ItemActions
        ref={actionsRef}
        name={tx.description}
        hideTrigger={compact}
        anchorRef={rowRef}
        actions={[
          ...(!tx.isCancelled
            ? [{
                id: 'edit',
                label: 'Editar',
                onSelect: () => onEdit(tx.id),
              }]
            : []),
          {
            id: 'remove',
            label: 'Excluir',
            danger: true,
            disabled: removing,
            onSelect: () => onRemove(tx),
          },
        ]}
      />
    </li>
  );
}

export function TransactionsPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const compact = useCompactLayout();
  const { year, month } = getCurrentPeriod();
  const [searchParams, setSearchParams] = useSearchParams();
  const filtersId = useId();

  const searchFromUrl = searchParams.get('q') ?? '';
  const appliedPanel = readPanelFromSearch(searchParams);
  const activeFilterCount = countActivePanelFilters(appliedPanel);

  const [searchInput, setSearchInput] = useState(searchFromUrl);
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const [draftPanel, setDraftPanel] = useState<PanelFilters>(appliedPanel);

  const panelKey = [
    appliedPanel.categoryId,
    appliedPanel.dateFrom,
    appliedPanel.dateTo,
    appliedPanel.minAmount,
    appliedPanel.maxAmount,
  ].join('|');

  useEffect(() => {
    setSearchInput(searchFromUrl);
  }, [searchFromUrl]);

  useEffect(() => {
    setDraftPanel(appliedPanel);
    if (activeFilterCount > 0) setFiltersOpen(true);
    // panelKey encodes the applied panel filters; avoid resetting draft while typing search
  }, [panelKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setSearchParams((prev) => {
      const current = prev.get('q') ?? '';
      if (deferredSearch === current) return prev;
      const next = new URLSearchParams(prev);
      if (deferredSearch) next.set('q', deferredSearch);
      else next.delete('q');
      return next;
    }, { replace: true });
  }, [deferredSearch, setSearchParams]);

  const hasDateRange = Boolean(appliedPanel.dateFrom || appliedPanel.dateTo);
  const listParams = {
    ...(hasDateRange
      ? {
          dateFrom: appliedPanel.dateFrom || undefined,
          dateTo: appliedPanel.dateTo || undefined,
        }
      : { year, month }),
    categoryId: appliedPanel.categoryId || undefined,
    search: deferredSearch || undefined,
    minAmount: appliedPanel.minAmount > 0 ? appliedPanel.minAmount : undefined,
    maxAmount: appliedPanel.maxAmount > 0 ? appliedPanel.maxAmount : undefined,
    limit: 200,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['transactions', listParams],
    queryFn: () => api.transactions.list(listParams),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const removeTransaction = useMutation({
    mutationFn: api.transactions.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const categoryOptions = sortByName(
    (categories ?? []).filter((category) => category.parentId && category.isActive),
  ).map((category) => ({
    value: category.id,
    label: category.name,
    hint: categories?.find((item) => item.id === category.parentId)?.name,
  }));

  const selectedCategoryName = categories?.find((item) => item.id === appliedPanel.categoryId)?.name;

  function writeUrlParams(nextPanel: PanelFilters, nextSearch = searchInput.trim()) {
    const next = new URLSearchParams();
    if (nextSearch) next.set('q', nextSearch);
    if (nextPanel.categoryId) next.set('categoria', nextPanel.categoryId);
    if (nextPanel.dateFrom) next.set('de', nextPanel.dateFrom);
    if (nextPanel.dateTo) next.set('ate', nextPanel.dateTo);
    if (nextPanel.minAmount > 0) next.set('min', String(nextPanel.minAmount));
    if (nextPanel.maxAmount > 0) next.set('max', String(nextPanel.maxAmount));
    setSearchParams(next, { replace: true });
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    writeUrlParams(draftPanel);
    setFiltersOpen(false);
  }

  function clearFilters() {
    const cleared = emptyPanelFilters();
    setDraftPanel(cleared);
    writeUrlParams(cleared);
  }

  function clearAllFilters() {
    setSearchInput('');
    setDraftPanel(emptyPanelFilters());
    setSearchParams({}, { replace: true });
  }

  function removeCategoryFilter() {
    const next = { ...appliedPanel, categoryId: '' };
    setDraftPanel(next);
    writeUrlParams(next);
  }

  if (isLoading) return <PageLoading message="Carregando lançamentos..." />;
  if (error) return <div className="page-error">Erro: {(error as Error).message}</div>;

  const transactions = [...(data?.data ?? [])].sort(
    (first, second) => new Date(second.date).getTime() - new Date(first.date).getTime(),
  );
  const total = data?.total ?? transactions.length;
  const hasQueryOrFilters = Boolean(deferredSearch) || activeFilterCount > 0;
  const subtitle = hasQueryOrFilters
    ? `${total} resultado${total === 1 ? '' : 's'}`
    : `${total} registros neste mês`;

  return (
    <div className="transactions-page">
      <PageToolbar
        title="Lançamentos"
        subtitle={subtitle}
        backTo="/"
        action={{ to: '/lancamentos/novo', label: 'Adicionar lançamento' }}
      />

      <div className="tx-filters">
        <div className="tx-search-bar">
          <label className="tx-search-field glass-module" htmlFor={`${filtersId}-search`}>
            <SearchIcon />
            <input
              id={`${filtersId}-search`}
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por descrição"
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          <button
            type="button"
            className={`tx-filter-toggle liquid-glass${filtersOpen ? ' is-open' : ''}${activeFilterCount > 0 ? ' has-filters' : ''}`}
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls={filtersId}
            aria-label={
              activeFilterCount > 0
                ? `Filtros (${activeFilterCount} ativos)`
                : 'Abrir filtros'
            }
          >
            <FunnelIcon />
            {activeFilterCount > 0 && (
              <span className="tx-filter-toggle__count" aria-hidden="true">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {activeFilterCount > 0 && (
          <div className="tx-filter-chips" aria-label="Filtros ativos">
            {appliedPanel.categoryId && (
              <button
                type="button"
                className="tx-filter-chip"
                onClick={removeCategoryFilter}
                aria-label={`Remover filtro de categoria ${selectedCategoryName ?? ''}`}
              >
                {selectedCategoryName ?? 'Categoria'}
                <span aria-hidden="true">×</span>
              </button>
            )}
            {(appliedPanel.dateFrom || appliedPanel.dateTo) && (
              <span className="tx-filter-chip tx-filter-chip--static">
                {appliedPanel.dateFrom || '…'}
                {' → '}
                {appliedPanel.dateTo || '…'}
              </span>
            )}
            {(appliedPanel.minAmount > 0 || appliedPanel.maxAmount > 0) && (
              <span className="tx-filter-chip tx-filter-chip--static">
                {appliedPanel.minAmount > 0 ? formatCurrency(appliedPanel.minAmount) : 'R$ 0'}
                {' – '}
                {appliedPanel.maxAmount > 0 ? formatCurrency(appliedPanel.maxAmount) : '∞'}
              </span>
            )}
          </div>
        )}

        {filtersOpen && (
          <form
            id={filtersId}
            className="tx-filter-panel glass-module"
            onSubmit={applyFilters}
          >
            <div className="form-group">
              <label htmlFor={`${filtersId}-category`}>Categoria</label>
              <Select
                id={`${filtersId}-category`}
                value={draftPanel.categoryId}
                onChange={(value) => setDraftPanel((current) => ({ ...current, categoryId: value }))}
                options={[
                  { value: '', label: 'Todas as categorias' },
                  ...categoryOptions,
                ]}
                placeholder="Todas as categorias"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`${filtersId}-from`}>Data inicial</label>
                <input
                  id={`${filtersId}-from`}
                  type="date"
                  value={draftPanel.dateFrom}
                  onChange={(event) =>
                    setDraftPanel((current) => ({ ...current, dateFrom: event.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor={`${filtersId}-to`}>Data final</label>
                <input
                  id={`${filtersId}-to`}
                  type="date"
                  value={draftPanel.dateTo}
                  min={draftPanel.dateFrom || undefined}
                  onChange={(event) =>
                    setDraftPanel((current) => ({ ...current, dateTo: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`${filtersId}-min`}>Valor de</label>
                <MoneyInput
                  id={`${filtersId}-min`}
                  value={draftPanel.minAmount}
                  onChange={(value) =>
                    setDraftPanel((current) => ({ ...current, minAmount: value }))
                  }
                  aria-label="Valor mínimo"
                />
              </div>
              <div className="form-group">
                <label htmlFor={`${filtersId}-max`}>Valor até</label>
                <MoneyInput
                  id={`${filtersId}-max`}
                  value={draftPanel.maxAmount}
                  onChange={(value) =>
                    setDraftPanel((current) => ({ ...current, maxAmount: value }))
                  }
                  aria-label="Valor máximo"
                />
              </div>
            </div>

            <div className="tx-filter-actions">
              <button type="button" className="btn-secondary" onClick={clearFilters}>
                Limpar
              </button>
              <button type="submit" className="btn-primary">
                Aplicar filtros
              </button>
            </div>
          </form>
        )}
      </div>

      {removeTransaction.error && (
        <div className="page-error" role="alert">
          Erro: {(removeTransaction.error as Error).message}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="empty-state">
          <AppLogo size="md" className="empty-state__logo" />
          <p>
            {hasQueryOrFilters
              ? 'Nenhum lançamento encontrado com esses filtros.'
              : 'Nenhum lançamento ainda.'}
          </p>
          {hasQueryOrFilters ? (
            <button type="button" className="btn-primary" onClick={clearAllFilters}>
              Limpar filtros
            </button>
          ) : (
            <Link to="/lancamentos/novo" className="btn-primary">
              Adicionar lançamento
            </Link>
          )}
        </div>
      ) : (
        <ul className="transactions-list glass-module">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              compact={compact}
              removing={removeTransaction.isPending}
              onEdit={(id) => navigate(`/lancamentos/novo?id=${encodeURIComponent(id)}`)}
              onRemove={(item) => {
                void confirm(transactionRemovalCopy(item.description)).then((ok) => {
                  if (ok) removeTransaction.mutate(item.id);
                });
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
