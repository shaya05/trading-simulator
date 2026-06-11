import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function AuthPage({ mode }) {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [formState, setFormState] = useState({ email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        await register(formState);
      } else {
        await login(formState);
      }
      navigate('/');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Beginner stock simulator</p>
        <h1>{mode === 'register' ? 'Create your paper trading account' : 'Welcome back'}</h1>
        <p className="muted">Trade with simulated cash, live Yahoo Finance data, and Gemini research support.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Display name
              <input
                value={formState.displayName}
                onChange={(event) => setFormState((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="A beginner trader"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={formState.password}
              onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-banner">{error}</div>}

          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Working...' : mode === 'register' ? 'Create account' : 'Log in'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'register' ? (
            <Link to="/login">Already have an account? Log in</Link>
          ) : (
            <Link to="/register">Need an account? Register</Link>
          )}
        </div>
      </div>
    </div>
  );
}