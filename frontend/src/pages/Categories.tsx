import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { PageLoading } from '../components/PageLoading';
import { TRANSACTION_TYPE_LABELS } from '../utils/format';
import './Categories.css';

export function CategoriesPage() {
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });

  if (isLoading) return <PageLoading message="Carregando categorias..." />;
  if (error) return <div className="page-error">Erro: {(error as Error).message}</div>;

  const parents = categories?.filter((c) => !c.parentId) ?? [];

  return (
    <div className="categories-page">
      <header className="page-header">
        <h1>Categorias</h1>
        <p className="subtitle">Organize entradas e saídas por grupo</p>
      </header>

      <div className="categories-grid">
        {parents.map((parent) => (
          <section key={parent.id} className="category-group">
            <h2>
              {parent.name}
              <span className="type-badge">{TRANSACTION_TYPE_LABELS[parent.type]}</span>
            </h2>
            <ul>
              {parent.children?.map((child) => (
                <li key={child.id} className={child.isActive ? '' : 'inactive'}>
                  {child.name}
                  {!child.isActive && <span className="inactive-label">inativa</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
