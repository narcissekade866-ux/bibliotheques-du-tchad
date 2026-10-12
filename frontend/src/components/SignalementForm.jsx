import { useState } from 'react';

const TYPES = [
  { value: 'horaires_incorrects', label: 'Horaires incorrects' },
  { value: 'adresse_incorrecte', label: 'Adresse incorrecte' },
  { value: 'fermeture', label: 'Bibliothèque fermée' },
  { value: 'autre', label: 'Autre erreur' },
];

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function SignalementForm({ bibliothequeId, onClose }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!type || description.length < 5) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/signalements/${bibliothequeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description, ...(email ? { email_contact: email } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Erreur ${res.status}`);
      }
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="section-card" style={{ marginTop: '16px' }}>
        <div className="alert alert-success">
          Merci pour votre signalement. Il sera examiné par notre équipe.
        </div>
        <button className="btn-ghost btn-sm" onClick={onClose} style={{ marginTop: '8px' }}>
          Fermer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="section-card" style={{ marginTop: '16px' }}>
      <h3 className="section-title">Signaler une erreur</h3>

      <label style={{ marginBottom: '12px' }}>
        Type d'erreur
        <select value={type} onChange={(e) => setType(e.target.value)} required>
          <option value="">— Choisir —</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      <label style={{ marginBottom: '12px' }}>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez l'erreur constatée (5 caractères minimum)"
          required
          minLength={5}
          maxLength={1000}
        />
      </label>

      <label style={{ marginBottom: '16px' }}>
        Email (optionnel, pour être prévenu)
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
        />
      </label>

      {error && <div className="alert alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !type || description.length < 5}>
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
          Annuler
        </button>
      </div>
    </form>
  );
}
