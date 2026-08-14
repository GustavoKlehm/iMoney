import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type ApplyBudgetResult, type BudgetPeriod } from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { PageLoading } from '../components/PageLoading';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { getCurrentPeriod, MONTH_NAMES } from '../utils/format';
import './BudgetPlanDetail.css';

function periodKey(period: BudgetPeriod) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function periodLabel(period: BudgetPeriod) {
  return `${MONTH_NAMES[period.month - 1]} de ${period.year}`;
}

function MonthBudgetEditor({ period }: { period: BudgetPeriod }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const dirtyBudgetIds = useRef(new Set<string>());

  const budgetsQuery = useQuery({
    queryKey: ['budgets', period.year, period.month],
    queryFn: () => api.budgets.list(period.year, period.month),
  });

  useEffect(() => {
    if (!budgetsQuery.data) return;
    setValues((current) =>
      Object.fromEntries(
        budgetsQuery.data.map((budget) => [
          budget.id,
          dirtyBudgetIds.current.has(budget.id)
            ? current[budget.id] ?? String(Number(budget.limitAmount))
            : String(Number(budget.limitAmount)),
        ]),
      ),
    );
  }, [budgetsQuery.data]);

  const updateBudget = useMutation({
    mutationFn: ({ id, limitAmount }: { id: string; limitAmount: number }) =>
      api.budgets.update(id, { limitAmount }),
    onSuccess: async (budget) => {
      dirtyBudgetIds.current.delete(budget.id);
      setValues((current) => ({
        ...current,
        [budget.id]: String(Number(budget.limitAmount)),
      }));
      await queryClient.invalidateQueries({
        queryKey: ['budgets', period.year, period.month],
      });
    },
  });

  if (budgetsQuery.isLoading) {
    return <p className="budget-month__status">Carregando limites...</p>;
  }

  if (budgetsQuery.error) {
    return (
      <p className="budget-month__error" role="alert">
        Erro: {(budgetsQuery.error as Error).message}
      </p>
    );
  }

  const budgets = budgetsQuery.data ?? [];
  if (budgets.length === 0) {
    return <p className="budget-month__status">Nenhum limite neste mês.</p>;
  }

  return (
    <div className="budget-month__limits">
      {budgets.map((budget) => {
        const parsedValue = Number(values[budget.id]);
        const canSave = Number.isFinite(parsedValue) && parsedValue > 0;
        return (
          <div key={budget.id} className="budget-month__limit">
            <label htmlFor={`budget-${budget.id}`}>{budget.category.name}</label>
            <div className="budget-money-field">
              <span aria-hidden="true">R$</span>
              <input
                id={`budget-${budget.id}`}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={values[budget.id] ?? ''}
                onChange={(event) => {
                  dirtyBudgetIds.current.add(budget.id);
                  setValues((current) => ({
                    ...current,
                    [budget.id]: event.target.value,
                  }));
                }}
              />
            </div>
            <button
              type="button"
              className="budget-secondary-button"
              disabled={updateBudget.isPending || !canSave}
              onClick={() => updateBudget.mutate({ id: budget.id, limitAmount: parsedValue })}
            >
              {updateBudget.isPending && updateBudget.variables?.id === budget.id
                ? 'Salvando...'
                : 'Salvar'}
            </button>
          </div>
        );
      })}
      {updateBudget.error && (
        <p className="budget-month__error" role="alert">
          Erro: {(updateBudget.error as Error).message}
        </p>
      )}
    </div>
  );
}

export function BudgetPlanDetailPage() {
  const { id = '' } = useParams();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPeriod = getCurrentPeriod();
  const [lineValues, setLineValues] = useState<Record<string, string>>({});
  const [startPeriod, setStartPeriod] = useState(periodKey(currentPeriod));
  const [months, setMonths] = useState('3');
  const [overwrite, setOverwrite] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<ApplyBudgetResult | null>(null);

  const templateQuery = useQuery({
    queryKey: ['budget-template', id],
    queryFn: () => api.budgetTemplates.get(id),
    enabled: Boolean(id),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const expenseChildren = useMemo(
    () =>
      (categoriesQuery.data ?? [])
        .filter((category) => !category.parentId && category.type === 'EXPENSE')
        .flatMap((parent) =>
          (parent.children ?? []).map((category) => ({
            ...category,
            parentName: parent.name,
          })),
        )
        .sort((first, second) =>
          `${first.parentName} ${first.name}`.localeCompare(
            `${second.parentName} ${second.name}`,
            'pt-BR',
          ),
        ),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (!templateQuery.data) return;
    setLineValues(
      Object.fromEntries(
        templateQuery.data.lines.map((line) => [
          line.categoryId,
          Number(line.amount) === 0 ? '' : String(Number(line.amount)),
        ]),
      ),
    );
  }, [templateQuery.data]);

  const templateLines = expenseChildren.map((category) => ({
    categoryId: category.id,
    amount: Number(lineValues[category.id]) || 0,
  }));

  const saveLines = useMutation({
    mutationFn: () =>
      api.budgetTemplates.update(id, {
        lines: templateLines,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budget-template', id] });
      await queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });

  const removeTemplate = useMutation({
    mutationFn: () => api.budgetTemplates.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      navigate('/planejamentos');
    },
  });

  const applyTemplate = useMutation({
    mutationFn: async () => {
      const [year, month] = startPeriod.split('-').map(Number);
      await api.budgetTemplates.update(id, { lines: templateLines });
      return api.budgetTemplates.apply(id, {
        startYear: year,
        startMonth: month,
        months: Number(months),
        overwrite,
      });
    },
    onSuccess: async (result) => {
      setApplyFeedback(result);
      await queryClient.invalidateQueries({ queryKey: ['budget-template', id] });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  function handleSaveLines(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveLines.mutate();
  }

  function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplyFeedback(null);
    applyTemplate.mutate();
  }

  if (templateQuery.isLoading || categoriesQuery.isLoading) {
    return <PageLoading message="Carregando planejamento..." />;
  }

  const pageError = templateQuery.error ?? categoriesQuery.error;
  if (pageError) {
    return <div className="page-error">Erro: {(pageError as Error).message}</div>;
  }

  const template = templateQuery.data;
  if (!template) return <div className="page-error">Planejamento não encontrado.</div>;

  const generatedPeriods = [...(template.budgets ?? [])].sort(
    (first, second) => second.year - first.year || second.month - first.month,
  );
  const validMonths = Number.isInteger(Number(months))
    && Number(months) >= 1
    && Number(months) <= 36;

  return (
    <div className="budget-plan-detail-page">
      <header className="page-header budget-plan-detail-header">
        <div>
          <h1>{template.name}</h1>
          <p className="subtitle">Defina o molde, gere os meses e ajuste exceções</p>
        </div>
        <ItemActions
          name={template.name}
          actions={[
            {
              id: 'remove',
              label: 'Excluir',
              danger: true,
              disabled: removeTemplate.isPending,
              onSelect: () => {
                void confirm(removalCopy(template.name, Boolean(template.hasGeneratedMonths))).then((ok) => {
                  if (ok) removeTemplate.mutate();
                });
              },
            },
          ]}
        />
      </header>
      {removeTemplate.error && (
        <p className="budget-detail-feedback budget-detail-feedback--error" role="alert">
          Erro: {(removeTemplate.error as Error).message}
        </p>
      )}

      <section className="budget-detail-section glass-module">
        <div className="budget-detail-section__heading">
          <div>
            <h2>Limites do molde</h2>
            <p>Valores vazios não serão replicados.</p>
          </div>
        </div>

        {expenseChildren.length === 0 ? (
          <p className="budget-detail-empty">
            Cadastre subcategorias de saída antes de montar o planejamento.
          </p>
        ) : (
          <form className="budget-lines-form" onSubmit={handleSaveLines}>
            <div className="budget-lines">
              {expenseChildren.map((category) => (
                <label key={category.id} className="budget-line" htmlFor={`line-${category.id}`}>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.parentName}</small>
                  </span>
                  <span className="budget-money-field">
                    <span aria-hidden="true">R$</span>
                    <input
                      id={`line-${category.id}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={lineValues[category.id] ?? ''}
                      placeholder="0,00"
                      onChange={(event) =>
                        setLineValues((current) => ({
                          ...current,
                          [category.id]: event.target.value,
                        }))
                      }
                    />
                  </span>
                </label>
              ))}
            </div>
            <button
              className="btn-submit"
              type="submit"
              disabled={saveLines.isPending || applyTemplate.isPending}
            >
              {saveLines.isPending ? 'Salvando molde...' : 'Salvar limites'}
            </button>
          </form>
        )}

        {saveLines.error && (
          <p className="budget-detail-feedback budget-detail-feedback--error" role="alert">
            Erro: {(saveLines.error as Error).message}
          </p>
        )}
      </section>

      <section className="budget-detail-section glass-module">
        <div className="budget-detail-section__heading">
          <div>
            <h2>Gerar meses</h2>
            <p>Repita os limites do molde a partir do mês escolhido.</p>
          </div>
        </div>

        <form className="budget-apply-form" onSubmit={handleApply}>
          <div className="glass-field">
            <label htmlFor="budget-start-period">Mês inicial</label>
            <input
              id="budget-start-period"
              type="month"
              value={startPeriod}
              onChange={(event) => setStartPeriod(event.target.value)}
              required
            />
          </div>
          <div className="glass-field">
            <label htmlFor="budget-month-count">Quantidade de meses</label>
            <input
              id="budget-month-count"
              type="number"
              inputMode="numeric"
              min="1"
              max="36"
              step="1"
              value={months}
              onChange={(event) => setMonths(event.target.value)}
              required
            />
          </div>
          <label className="budget-overwrite">
            <input
              type="checkbox"
              checked={overwrite}
              onChange={(event) => setOverwrite(event.target.checked)}
            />
            <span>
              <strong>Substituir existentes</strong>
              <small>Atualiza limites já criados nesses meses.</small>
            </span>
          </label>
          <button
            className="btn-submit"
            type="submit"
            disabled={
              applyTemplate.isPending || saveLines.isPending || !startPeriod || !validMonths
            }
          >
            {applyTemplate.isPending ? 'Salvando e gerando...' : 'Gerar meses'}
          </button>
        </form>

        {applyFeedback && (
          <p className="budget-detail-feedback" role="status">
            {applyFeedback.created} {applyFeedback.created === 1 ? 'limite criado' : 'limites criados'}
            {applyFeedback.skipped > 0
              ? ` · ${applyFeedback.skipped} ${applyFeedback.skipped === 1 ? 'existente mantido' : 'existentes mantidos'}`
              : ''}
          </p>
        )}
        {applyTemplate.error && (
          <p className="budget-detail-feedback budget-detail-feedback--error" role="alert">
            Erro: {(applyTemplate.error as Error).message}
          </p>
        )}
      </section>

      <section className="budget-months-section">
        <div className="budget-detail-section__heading">
          <div>
            <h2>Meses gerados</h2>
            <p>Abra um mês para ajustar somente aquele período.</p>
          </div>
        </div>

        {generatedPeriods.length === 0 ? (
          <div className="empty-state budget-detail-empty">
            Nenhum mês gerado por este planejamento.
          </div>
        ) : (
          <div className="budget-months">
            {generatedPeriods.map((period) => (
              <details key={periodKey(period)} className="budget-month glass-module">
                <summary>{periodLabel(period)}</summary>
                <MonthBudgetEditor period={period} />
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
