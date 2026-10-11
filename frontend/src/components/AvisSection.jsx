import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../services/api';

function Stars({ rating, onRate, interactive }) {
  return (
    <span className={interactive ? '' : ''} style={{ fontSize: '22px', cursor: interactive ? 'pointer' : 'default', letterSpacing: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} onClick={() => interactive && onRate(n)}
          className={n <= rating ? 'stars' : 'stars-empty'}
          style={{ transition: 'color 150ms' }}>
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default function AvisSection({ bibliothequeId }) {
  const { user } = useAuth();
  const [data, setData] = useState({ avis: [], total: 0, moyenne: null });
  const [note, setNote] = useState(0);
  const [commentaire, setCommentaire] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  async function load() {
    try {
      const result = await apiGet(`/avis/bibliotheque/${bibliothequeId}`);
      setData(result);
    } catch { /* ignore */ }
  }

  useEffect(() => { load(); }, [bibliothequeId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (note < 1) return;
    setSubmitting(true);
    setMessage({ text: '', type: '' });
    try {
      await apiPost(`/avis/bibliotheque/${bibliothequeId}`, {
        note,
        ...(commentaire.trim() ? { commentaire: commentaire.trim() } : {}),
      });
      setMessage({ text: 'Merci ! Votre avis sera visible après modération.', type: 'success' });
      setNote(0);
      setCommentaire('');
      load();
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-card">
      <h3 className="section-title">
        Avis
        {data.total > 0 && (
          <span style={{ fontWeight: 400, fontSize: '14px', color: 'var(--text-muted)' }}>
            {data.moyenne}/5 ({data.total} avis)
          </span>
        )}
      </h3>

      {user && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <Stars rating={note} onRate={setNote} interactive />
          </div>
          <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Votre commentaire (optionnel)" rows={3} />
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={note < 1 || submitting}>
              {submitting ? 'Envoi...' : 'Publier'}
            </button>
            {message.text && (
              <span className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}
                style={{ padding: '6px 12px', fontSize: '13px' }}>
                {message.text}
              </span>
            )}
          </div>
        </form>
      )}

      {!user && (
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          <a href="/connexion">Connectez-vous</a> pour laisser un avis.
        </p>
      )}

      {data.avis.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {data.avis.map((a) => (
            <div key={a.id} className="card" style={{ padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <strong style={{ fontSize: '14px' }}>{a.auteur_nom}</strong>
                <Stars rating={a.note} interactive={false} />
              </div>
              {a.commentaire && <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{a.commentaire}</p>}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {new Date(a.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Aucun avis pour le moment.</p>
      )}
    </div>
  );
}
