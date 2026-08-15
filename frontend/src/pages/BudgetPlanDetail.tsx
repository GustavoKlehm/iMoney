import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api, type BudgetPeriod } from '../api/client';
import { MoneyInput } from '../components/MoneyInput';
import { PageLoading } from '../components/PageLoading';
import { getCurrentPeriod, MONTH_NAMES } from '../utils/format';
import { compareByName } from '../utils/sortByName';
import './BudgetPlanDetail.css';

const STEPS = [
  { id: 1, title: 'Limites gerais', short: 'Limites' },
  { id: 2, title: 'Período', short: 'Período' },
  { id: 3, title: 'Ajustes por mês', short: 'Ajustes' },
] as const;

function periodKey(period: BudgetPeriod) {
  return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function periodLabel(period: BudgetPeriod) {
  return `${MONTH_NAMES[period.month - 1]} de ${period.year}`;
}

function monthSequence(
  startYear: number,
  startMonth: number,
  count: number,
): BudgetPeriod[] {
  const out: BudgetPeriod[] = [];
  let year = startYear;
  let month = startMonth;
  for (let i = 0; i < count; i += 1) {
    out.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

function parsePeriod(value: string): BudgetPeriod | null {
  const [year, month] = value.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function BudgetPlanDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPeriod = getCurrentPeriod();
  const [step, setStep] = useState(1);
  const [lineValues, setLineValues] = useState<Record<string, number>>({});
  const [startPeriod, setStartPeriod] = useState(periodKey(currentPeriod));
  const [months, setMonths] = useState('3');
  const [monthValues, setMonthValues] = useState<Record<string, Record<string, number>>>({});
  const periodInitRef = useRef(false);
  const touchedMonthsRef = useRef(new Set<string>());

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
          compareByName(first.name, second.name)
          || compareByName(first.parentName, second.parentName),
        ),
    [categoriesQuery.data],
  );

  useEffect(() => {
    if (!templateQuery.data) return;
    setLineValues(
      Object.fromEntries(
        templateQuery.data.lines.map((line) => [
          line.categoryId,
          Number(line.amount),
        ]),
      ),
    );

    if (periodInitRef.current) return;
    const generated = [...(templateQuery.data.budgets ?? [])].sort(
      (first, second) => first.year - second.year || first.month - second.month,
    );
    if (generated.length === 0) return;
    periodInitRef.current = true;
    setStartPeriod(periodKey(generated[0]));
    setMonths(String(generated.length));
  }, [templateQuery.data]);

  const templateLines = expenseChildren.map((category) => ({
    categoryId: category.id,
    amount: lineValues[category.id] || 0,
  }));
  const hasPositiveLimits = templateLines.some((line) => line.amount > 0);
  const monthCount = Number(months);
  const validMonths = Number.isInteger(monthCount) && monthCount >= 1 && monthCount <= 36;
  const start = parsePeriod(startPeriod);
  const periods = start && validMonths
    ? monthSequence(start.year, start.month, monthCount)
    : [];
  const endPeriod = periods.at(-1) ?? null;

  const savePlan = useMutation({
    mutationFn: async (input: {
      lines: { categoryId: string; amount: number }[];
      defaults: Record<string, number>;
      categories: string[];
      startYear: number;
      startMonth: number;
      monthCount: number;
      periods: BudgetPeriod[];
      drafts: Record<string, Record<string, number>>;
    }) => {
      await api.budgetTemplates.update(id, { lines: input.lines });
      await api.budgetTemplates.apply(id, {
        startYear: input.startYear,
        startMonth: input.startMonth,
        months: input.monthCount,
        overwrite: true,
        monthLines: input.periods.map((period) => {
          const drafts = input.drafts[periodKey(period)] ?? input.defaults;
          return {
            year: period.year,
            month: period.month,
            lines: input.categories.map((categoryId) => ({
              categoryId,
              amount: drafts[categoryId] ?? input.defaults[categoryId] ?? 0,
            })),
          };
        }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['budget-template', id] }),
        queryClient.invalidateQueries({ queryKey: ['budget-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
      ]);
      navigate('/planejamentos');
    },
  });

  function seedMonthDrafts() {
    setMonthValues((current) => {
      const next: Record<string, Record<string, number>> = {};
      for (const period of periods) {
        const key = periodKey(period);
        next[key] = current[key] ?? { ...lineValues };
      }
      return next;
    });

    void Promise.all(
      periods.map(async (period) => {
        const key = periodKey(period);
        if (touchedMonthsRef.current.has(key)) return;
        try {
          const budgets = await api.budgets.list(period.year, period.month);
          if (touchedMonthsRef.current.has(key) || budgets.length === 0) return;
          setMonthValues((current) => ({
            ...current,
            [key]: {
              ...lineValues,
              ...(current[key] ?? {}),
              ...Object.fromEntries(
                budgets.map((budget) => [budget.categoryId, Number(budget.limitAmount)]),
              ),
            },
          }));
        } catch {
          /* mantém a cópia do molde */
        }
      }),
    );
  }

  function goNext() {
    if (step === 1 && !hasPositiveLimits) return;
    if (step === 2 && (!start || !validMonths)) return;
    if (step === 2) seedMonthDrafts();
    setStep((current) => Math.min(3, current + 1));
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
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

  const currentStep = STEPS[step - 1];
  const canGoNext = step === 1 ? hasPositiveLimits : Boolean(start && validMonths);

  return (
    <div className="budget-plan-detail-page">
      <header className="page-header budget-plan-detail-header">
        <div>
          <h1>{template.name}</h1>
          <p className="subtitle">
            Etapa {step} de {STEPS.length} · {currentStep.title}
          </p>
        </div>
      </header>

      <ol className="wizard-steps" aria-label="Etapas do planejamento">
        {STEPS.map((item) => (
          <li
            key={item.id}
            className={
              item.id === step
                ? 'wizard-steps__item wizard-steps__item--current'
                : item.id < step
                  ? 'wizard-steps__item wizard-steps__item--done'
                  : 'wizard-steps__item'
            }
          >
            <button
              type="button"
              disabled={item.id > step}
              aria-current={item.id === step ? 'step' : undefined}
              onClick={() => {
                if (item.id < step) setStep(item.id);
              }}
            >
              <span>{item.id}</span>
              {item.short}
            </button>
          </li>
        ))}
      </ol>

      {step === 1 && (
        <section className="budget-detail-section glass-module">
          <div className="budget-detail-section__heading">
            <h2>Limites gerais</h2>
            <p>Defina os valores padrão. Zero no molde ainda pode ganhar um limite em um mês específico.</p>
          </div>
          {expenseChildren.length === 0 ? (
            <p className="budget-detail-empty">
              Cadastre subcategorias de saída antes de montar o planejamento.
            </p>
          ) : (
            <div className="budget-lines">
              {expenseChildren.map((category) => (
                <label key={category.id} className="budget-line" htmlFor={`line-${category.id}`}>
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.parentName}</small>
                  </span>
                  <span className="budget-money-field">
                    <span aria-hidden="true">R$</span>
                    <MoneyInput
                      id={`line-${category.id}`}
                      value={lineValues[category.id] ?? 0}
                      onChange={(nextValue) =>
                        setLineValues((current) => ({
                          ...current,
                          [category.id]: nextValue,
                        }))
                      }
                    />
                  </span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="budget-detail-section glass-module">
          <div className="budget-detail-section__heading">
            <h2>Período</h2>
            <p>Escolha o mês inicial e quantos meses o molde deve cobrir.</p>
          </div>
          <div className="budget-apply-form">
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
            <div className="budget-end-period" aria-live="polite">
              <span>Mês final</span>
              <strong>{endPeriod ? periodLabel(endPeriod) : '—'}</strong>
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="budget-months-section">
          <div className="budget-detail-section__heading">
            <h2>Ajustes por mês</h2>
            <p>Inclui categorias zeradas no molde. Zero neste mês permanece zero — não volta ao padrão.</p>
          </div>
          <div className="budget-months">
            {periods.map((period) => {
              const key = periodKey(period);
              const drafts = monthValues[key] ?? lineValues;
              return (
                <details key={key} className="budget-month glass-module">
                  <summary>{periodLabel(period)}</summary>
                  <div className="budget-month__limits">
                    {expenseChildren.map((category) => (
                      <div key={category.id} className="budget-month__limit">
                        <label htmlFor={`${key}-${category.id}`}>
                          {category.name}
                          <small>{category.parentName}</small>
                        </label>
                        <div className="budget-money-field">
                          <span aria-hidden="true">R$</span>
                          <MoneyInput
                            id={`${key}-${category.id}`}
                            value={drafts[category.id] ?? 0}
                            onChange={(nextValue) => {
                              touchedMonthsRef.current.add(key);
                              setMonthValues((current) => ({
                                ...current,
                                [key]: {
                                  ...(current[key] ?? lineValues),
                                  [category.id]: nextValue,
                                },
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {savePlan.error && (
        <p className="budget-detail-feedback budget-detail-feedback--error" role="alert">
          Erro: {(savePlan.error as Error).message}
        </p>
      )}

      <nav className="wizard-nav" aria-label="Navegação das etapas">
        {step > 1 && (
          <button
            type="button"
            className="wizard-nav__back"
            onClick={goBack}
            disabled={savePlan.isPending}
          >
            Voltar à etapa anterior
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            className="btn-submit"
            onClick={goNext}
            disabled={!canGoNext}
          >
            Próxima etapa
          </button>
        ) : (
          <button
            type="button"
            className="btn-submit"
            onClick={() => {
              if (!start || !validMonths) return;
              savePlan.mutate({
                lines: templateLines,
                defaults: lineValues,
                categories: expenseChildren.map((category) => category.id),
                startYear: start.year,
                startMonth: start.month,
                monthCount,
                periods,
                drafts: monthValues,
              });
            }}
            disabled={savePlan.isPending || !hasPositiveLimits || !validMonths}
          >
            {savePlan.isPending ? 'Salvando...' : 'Salvar planejamento'}
          </button>
        )}
      </nav>
    </div>
  );
}
