import React, { useState } from 'react';
import { login } from '../../lib/api';

export default function AccessGate({ onAuthenticated, initialError = '' }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);
  const [submitting, setSubmitting] = useState(false);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(password);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="access-gate">
      <form className="access-card" onSubmit={submit}>
        <div className="eyebrow">Pentelligence / Restricted</div>
        <h1>Authorized access only.</h1>
        <p>This system can run security tools against external targets. Enter the deployment password to continue.</p>
        <label htmlFor="app-password">Deployment password</label>
        <input
          id="app-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="Enter password"
          required
        />
        {error && <div className="access-error">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? 'VERIFYING...' : 'UNLOCK WORKSPACE'}</button>
      </form>
    </main>
  );
}
