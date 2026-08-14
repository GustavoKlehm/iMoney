import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  api,
  type Category,
  type CreateCategory,
  type TransactionType,
} from '../api/client';
import { ItemActions } from '../components/ItemActions';
import { PageLoading } from '../components/PageLoading';
import { useConfirm } from '../components/ConfirmProvider';
import { removalCopy } from '../utils/confirmRemoval';
import { TRANSACTION_TYPE_LABELS } from '../utils/format';
import './Categories.css';

type CategoryKind = 'GROUP' | 'CHILD';
type EditableCategoryType = Extract<TransactionType, 'INCOME' | 'EXPENSE'>;

function sortChildren(children: Category[] = []) {
  return [...children].sort((first, second) => Number(second.isActive) - Number(first.isActive));
}

export function CategoriesPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelEditRef = useRef(false);
  const [kind, setKind] = useState<CategoryKind>('GROUP');
  const [name, setName] = useState('');
  const [type, setType] = useState<EditableCategoryType>('EXPENSE');
  const [parentId, setParentId] = useState('');
  const [openParents, setOpenParents] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: ['categories'] });

  const createCategory = useMutation({
    mutationFn: (data: CreateCategory) => api.categories.create(data),
    onSuccess: async () => {
      setName('');
      setParentId('');
      setKind('GROUP');
      await invalidateCategories();
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategory> & { isActive?: boolean } }) =>
      api.categories.update(id, data),
    onSuccess: async () => {
      setEditingId(null);
      setEditingName('');
      await invalidateCategories();
    },
  });

  const removeCategory = useMutation({
    mutationFn: api.categories.remove,
    onSuccess: invalidateCategories,
  });

  if (categoriesQuery.isLoading) {
    return <PageLoading message="Carregando categorias..." />;
  }

  if (categoriesQuery.error) {
    return <div className="page-error">Erro: {(categoriesQuery.error as Error).message}</div>;
  }

  const categories = categoriesQuery.data ?? [];
  const parents = categories.filter((category) => !category.parentId);
  const activeParents = parents.filter(
    (category) =>
      category.isActive && (category.type === 'INCOME' || category.type === 'EXPENSE'),
  );
  const expenseParents = parents.filter((category) => category.type === 'EXPENSE');
  const incomeParents = parents.filter((category) => category.type === 'INCOME');
  const mutationError = createCategory.error ?? updateCategory.error ?? removeCategory.error;
  const mutationPending =
    createCategory.isPending || updateCategory.isPending || removeCategory.isPending;

  function toggleParent(id: string) {
    setOpenParents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectKind(nextKind: CategoryKind) {
    setKind(nextKind);
    if (nextKind === 'GROUP') {
      setParentId('');
      return;
    }

    const selectedParent = activeParents.find((parent) => parent.id === parentId)
      ?? activeParents[0];
    setParentId(selectedParent?.id ?? '');
    if (selectedParent?.type === 'INCOME' || selectedParent?.type === 'EXPENSE') {
      setType(selectedParent.type);
    }
  }

  function selectParent(nextParentId: string) {
    setParentId(nextParentId);
    const selectedParent = activeParents.find((parent) => parent.id === nextParentId);
    if (selectedParent?.type === 'INCOME' || selectedParent?.type === 'EXPENSE') {
      setType(selectedParent.type);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || (kind === 'CHILD' && !parentId)) return;

    createCategory.mutate({
      name: trimmedName,
      type,
      parentId: kind === 'CHILD' ? parentId : undefined,
    });
  }

  function prepareChild(parent: Category) {
    setKind('CHILD');
    setParentId(parent.id);
    if (parent.type === 'INCOME' || parent.type === 'EXPENSE') setType(parent.type);
    setName('');
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  function startEditing(category: Category) {
    cancelEditRef.current = false;
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function commitEdit(category: Category) {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setEditingId(null);
      setEditingName('');
      return;
    }

    const trimmedName = editingName.trim();
    if (!trimmedName || trimmedName === category.name) {
      setEditingId(null);
      setEditingName('');
      return;
    }

    updateCategory.mutate({ id: category.id, data: { name: trimmedName } });
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === 'Escape') {
      cancelEditRef.current = true;
      event.currentTarget.blur();
    }
  }

  async function remove(category: Category) {
    if (await confirm(removalCopy(category.name, Boolean(category.hasHistory)))) {
      removeCategory.mutate(category.id);
    }
  }

  function reactivate(category: Category) {
    updateCategory.mutate({ id: category.id, data: { isActive: true } });
  }

  function renderEditInput(category: Category) {
    return (
      <input
        className="category-name-input"
        value={editingName}
        onChange={(event) => setEditingName(event.target.value)}
        onBlur={() => commitEdit(category)}
        onKeyDown={handleEditKeyDown}
        aria-label={`Editar nome de ${category.name}`}
        maxLength={100}
        disabled={updateCategory.isPending}
        autoFocus
      />
    );
  }

  function renderGroup(parent: Category) {
    const isOpen = openParents.has(parent.id);
    const children = sortChildren(parent.children);

    return (
      <article key={parent.id} className={`category-group${parent.isActive ? '' : ' inactive'}`}>
        <div className="category-group__header">
          <div className="category-group__title">
            {editingId === parent.id ? (
              renderEditInput(parent)
            ) : (
              <button
                type="button"
                className="category-toggle"
                aria-expanded={isOpen}
                aria-controls={`category-children-${parent.id}`}
                onClick={() => toggleParent(parent.id)}
              >
                <span className="category-chevron" aria-hidden="true" />
                <span className="category-title">{parent.name}</span>
                <span className="type-badge">{TRANSACTION_TYPE_LABELS[parent.type]}</span>
                {!parent.isActive && <span className="inactive-label">Inativa</span>}
              </button>
            )}
          </div>

          <div className="category-actions">
            <ItemActions
              name={parent.name}
              actions={[
                {
                  id: 'edit',
                  label: 'Editar',
                  disabled: mutationPending,
                  onSelect: () => startEditing(parent),
                },
                ...(parent.isActive
                  ? [{
                      id: 'child',
                      label: 'Adicionar filha',
                      disabled: mutationPending,
                      onSelect: () => prepareChild(parent),
                    }]
                  : [{
                      id: 'reactivate',
                      label: 'Reativar',
                      disabled: mutationPending,
                      onSelect: () => reactivate(parent),
                    }]),
                {
                  id: 'remove',
                  label: 'Excluir',
                  danger: true,
                  disabled: mutationPending,
                  onSelect: () => remove(parent),
                },
              ]}
            />
          </div>
        </div>

        {isOpen && (
          <ul id={`category-children-${parent.id}`} className="category-children">
            {children.length === 0 ? (
              <li className="category-empty">Nenhuma subcategoria.</li>
            ) : (
              children.map((child) => (
                <li key={child.id} className={child.isActive ? '' : 'inactive'}>
                  <div className="category-child__name">
                    {editingId === child.id ? renderEditInput(child) : <span>{child.name}</span>}
                    {!child.isActive && <span className="inactive-label">Inativa</span>}
                  </div>
                  <div className="category-actions">
                    <ItemActions
                      name={child.name}
                      actions={[
                        {
                          id: 'edit',
                          label: 'Editar',
                          disabled: mutationPending,
                          onSelect: () => startEditing(child),
                        },
                        ...(child.isActive
                          ? []
                          : [{
                              id: 'reactivate',
                              label: 'Reativar',
                              disabled: mutationPending,
                              onSelect: () => reactivate(child),
                            }]),
                        {
                          id: 'remove',
                          label: 'Excluir',
                          danger: true,
                          disabled: mutationPending,
                          onSelect: () => remove(child),
                        },
                      ]}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        )}
      </article>
    );
  }

  function renderSection(title: string, items: Category[]) {
    return (
      <section className="category-section">
        <h2>{title}</h2>
        <div className="category-list">
          {items.length === 0
            ? <p className="category-section__empty">Nenhum grupo cadastrado.</p>
            : items.map(renderGroup)}
        </div>
      </section>
    );
  }

  return (
    <div className="categories-page">
      <header className="page-header">
        <h1>Categorias</h1>
        <p className="subtitle">Organize entradas e saídas por grupo</p>
      </header>

      <form className="category-form glass-module" onSubmit={handleSubmit}>
        <h2>Nova categoria</h2>
        <div className="category-kind" role="radiogroup" aria-label="Nível da categoria">
          <label>
            <input
              type="radio"
              name="category-kind"
              checked={kind === 'GROUP'}
              onChange={() => selectKind('GROUP')}
            />
            Grupo
          </label>
          <label>
            <input
              type="radio"
              name="category-kind"
              checked={kind === 'CHILD'}
              onChange={() => selectKind('CHILD')}
              disabled={activeParents.length === 0}
            />
            Subcategoria
          </label>
        </div>

        <div className="glass-field">
          <label htmlFor="category-name">Nome</label>
          <input
            ref={nameInputRef}
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={kind === 'GROUP' ? 'Ex.: Moradia' : 'Ex.: Aluguel'}
            maxLength={100}
            required
          />
        </div>

        {kind === 'GROUP' ? (
          <div className="glass-field">
            <label htmlFor="category-type">Tipo</label>
            <select
              id="category-type"
              value={type}
              onChange={(event) => setType(event.target.value as EditableCategoryType)}
            >
              <option value="EXPENSE">Saída</option>
              <option value="INCOME">Entrada</option>
            </select>
          </div>
        ) : (
          <div className="glass-field">
            <label htmlFor="category-parent">Grupo</label>
            <select
              id="category-parent"
              value={parentId}
              onChange={(event) => selectParent(event.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {activeParents.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name} · {TRANSACTION_TYPE_LABELS[parent.type]}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          className="btn-submit"
          type="submit"
          disabled={createCategory.isPending || !name.trim() || (kind === 'CHILD' && !parentId)}
        >
          {createCategory.isPending ? 'Salvando...' : 'Criar categoria'}
        </button>
      </form>

      {mutationError && (
        <div className="categories-feedback" role="alert">
          Erro: {(mutationError as Error).message}
        </div>
      )}

      <div className="category-sections">
        {renderSection('Saídas', expenseParents)}
        {renderSection('Entradas', incomeParents)}
      </div>
    </div>
  );
}
