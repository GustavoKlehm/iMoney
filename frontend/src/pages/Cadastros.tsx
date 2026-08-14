import { Link } from 'react-router-dom';
import './Cadastros.css';

const registrationLinks = [
  {
    to: '/contas',
    title: 'Contas e cofrinhos',
    description: 'Organize saldos disponíveis e valores reservados.',
  },
  {
    to: '/categorias',
    title: 'Categorias',
    description: 'Classifique suas entradas e saídas.',
  },
  {
    to: '/planejamentos',
    title: 'Planejamentos',
    description: 'Prepare seus limites e gastos futuros.',
  },
  {
    to: '/objetivos',
    title: 'Objetivos',
    description: 'Acompanhe as metas financeiras do casal.',
  },
];

export function CadastrosPage() {
  return (
    <div className="registrations-page">
      <header className="page-header">
        <h1>Cadastros</h1>
        <p className="subtitle">Configure a estrutura da vida financeira do casal</p>
      </header>

      <nav className="registrations-list" aria-label="Opções de cadastros">
        {registrationLinks.map((item) => (
          <Link key={item.to} to={item.to} className="registration-link glass-module">
            <span className="registration-link__title">{item.title}</span>
            <span className="registration-link__description">{item.description}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
