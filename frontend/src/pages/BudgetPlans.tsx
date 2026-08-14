import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CreateBudgetTemplate } from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { PageLoading } from '../components/PageLoading';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { formatCurrency } from '../utils/format';
import './BudgetPlans.css';

export function BudgetPlansPage() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const templatesQuery = useQuery({
    queryKey: ['budget-templates'],
    queryFn: api.budgetTemplates.list,
  });

  const createTemplate = useMutation({
    mutationFn: (data: CreateBudgetTemplate) => api.budgetTemplates.create(data),
    onSuccess: async (template) => {
      await queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
      navigate(`/planejamentos/${template.id}`);
    },
  });

  const removeTemplate = useMutation({
    mutationFn: api.budgetTemplates.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName) createTemplate.mutate({ name: trimmedName, lines: [] });
  }

  if (templatesQuery.isLoading) {
    return <PageLoading message="Carregando planejamentos..." />;
  }

  if (templatesQuery.error) {
    return <div className="page-error">Erro: {(templatesQuery.error as Error).message}</div>;
  }

  const templates = templatesQuery.data ?? [];

  return (
    <div className="budget-plans-page">
      <header className="page-header budget-plans-header">
        <div>
          <h1>Planejamentos</h1>
          <p className="subtitle">Crie moldes e replique seus limites nos próximos meses</p>
        </div>
        <button
          type="button"
          className="btn-primary budget-plans-header__action"
          aria-expanded={showForm}
          aria-controls="new-budget-plan"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? 'Fechar formulário' : 'Novo planejamento'}
        </button>
      </header>

      {showForm && (
        <form
          id="new-budget-plan"
          className="budget-plan-form glass-module"
          onSubmit={handleSubmit}
        >
          <div className="glass-field">
            <label htmlFor="budget-plan-name">Nome do planejamento</label>
            <input
              id="budget-plan-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Rotina"
              maxLength={100}
              required
              autoFocus
            />
          </div>
          <button
            className="btn-submit"
            type="submit"
            disabled={createTemplate.isPending || !name.trim()}
          >
            {createTemplate.isPending ? 'Criando...' : 'Criar planejamento'}
          </button>
        </form>
      )}

      {createTemplate.error && (
        <div className="budget-plans-feedback" role="alert">
          Erro: {(createTemplate.error as Error).message}
        </div>
      )}
      {removeTemplate.error && (
        <div className="budget-plans-feedback" role="alert">
          Erro: {(removeTemplate.error as Error).message}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="empty-state budget-plans-empty">
          <h2>Comece pelo primeiro molde</h2>
          <p>Defina limites por categoria e use o mesmo plano em vários meses.</p>
        </div>
      ) : (
        <div className="budget-plans-list">
          {templates.map((template) => {
            const total = template.lines.reduce((sum, line) => sum + Number(line.amount), 0);
            const activeLines = template.lines.filter((line) => Number(line.amount) > 0).length;
            return (
              <article key={template.id} className="budget-plan-card glass-module">
                <div className="budget-plan-card__toolbar">
                  <ItemActions
                    name={template.name}
                    actions={[
                      {
                        id: 'edit',
                        label: 'Editar',
                        onSelect: () => navigate(`/planejamentos/${template.id}`),
                      },
                      {
                        id: 'remove',
                        label: 'Excluir',
                        danger: true,
                        disabled: removeTemplate.isPending,
                        onSelect: () => {
                          void confirm(removalCopy(template.name, Boolean(template.hasGeneratedMonths))).then((ok) => {
                            if (ok) removeTemplate.mutate(template.id);
                          });
                        },
                      },
                    ]}
                  />
                </div>
                <Link
                  to={`/planejamentos/${template.id}`}
                  className="budget-plan-card__hit"
                >
                  <span className="budget-plan-card__name">{template.name}</span>
                  <span className="budget-plan-card__summary">
                    {activeLines} {activeLines === 1 ? 'limite' : 'limites'} · {formatCurrency(total)}
                  </span>
                  <span className="budget-plan-card__action">Abrir planejamento</span>
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
