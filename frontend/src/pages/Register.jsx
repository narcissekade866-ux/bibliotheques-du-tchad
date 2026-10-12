import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setSubmitting(true);
    try {
      await register(nom, email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>Bibliofinder</span>
        </div>
        <h1 className="auth-title">Créer un compte</h1>

        {error && <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <label>
            Nom complet
            <input type="text" required value={nom} onChange={(e) => setNom(e.target.value)}
              autoComplete="name" placeholder="Prénom Nom" />
          </label>

          <label>
            Adresse email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" placeholder="nom@exemple.com" />
          </label>

          <label>
            Mot de passe
            <input type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>
              Minimum 8 caractères
            </span>
          </label>

          <label>
            Confirmer le mot de passe
            <input type="password" required value={confirm}
              onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}
            style={{ marginTop: '4px' }}>
            {submitting ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-footer">
          Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
