import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { AppLogo } from '../components/AppLogo';
import { WallpaperBackground } from '../components/WallpaperBackground';
import './Login.css';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch {
      setError('E-mail ou senha incorretos');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <WallpaperBackground />
      <form className="login-form tx-form" onSubmit={handleSubmit}>
        <div className="login-form__brand">
          <AppLogo size="md" />
          <div>
            <h1>Entrar</h1>
            <p>Acesse o controle financeiro do casal</p>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn-submit" type="submit" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
