import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../services/api';

const TYPES_ACTIVITES = [
  'Club de lecture',
  'Atelier d\'écriture',
  'Conférence',
  'Exposition',
  'Projection',
  'Formation',
  'Animation jeunesse',
  'Autre',
];

export default function ActivitesSection({ bibliothequeId }) {
  const { user } = useAuth();
  const [activites, setActivites] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({ description: '', date_activite: '', types_activites: [], gratuites: 'oui' });

  const canCreate = user?.role === 'administrateur' || user?.role === 'responsable_bibliotheque';

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet(`/activites/bibliotheque/${bibliothequeId}?upcoming=true`);
        setActivites(data);
      } catch { setActivites([]); }
      setLoading(false);
    }
    load();
  }, [bibliothequeId]);

  function toggleType(t) {
    setForm((prev) => ({
      ...prev,
      types_activites: prev.types_activites.includes(t)
        ? prev.types_activites.filter((x) => x !== t)
        : [...prev.types_activites, t],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setSubmitting(true);
    setFeedback('');
    try {
      const payload = {
        bibliotheque_id: bibliothequeId,
        description: form.description,
        gratuites: form.gratuites,
      };
      if (form.date_activite) payload.date_activite = form.date_activite;
      if (form.types_activites.length > 0) payload.types_activites = form.types_activites;

      const created = await apiPost('/activites', payload);
      setActivites((prev) => [created, ...prev]);
      setForm({ description: '', date_activite: '', types_activites: [], gratuites: 'oui' });
      setShowForm(false);
      setFeedback('Activité publiée');
    } catch (err) {
      setFeedback(err.message || 'Erreur');
    }
    setSubmitting(false);
  }

  if (loading) return null;

  return (
    <div className="section-card" style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Activités culturelles</h3>
        {canCreate && !showForm && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>
            + Publier
          </button>
        )}
      </div>

      {feedback && <div className="alert alert-success" style={{ marginBottom: '12px' }}>{feedback}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
          <label>
            Description *
            <textarea rows={3} value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Décrivez l'activité…" required />
          </label>
          <label>
            Date
            <input type="date" value={form.date_activite}
              onChange={(e) => setForm((p) => ({ ...p, date_activite: e.target.value }))} />
          </label>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Type(s)</span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {TYPES_ACTIVITES.map((t) => (
                <button key={t} type="button"
                  className={`btn btn-sm ${form.types_activites.includes(t) ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => toggleType(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <label>
            Gratuit ?
            <select value={form.gratuites} onChange={(e) => setForm((p) => ({ ...p, gratuites: e.target.value }))}>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
              <option value="partiel">Partiellement</option>
            </select>
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
              {submitting ? 'Publication…' : 'Publier'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>Annuler</button>
          </div>
        </form>
      )}

      {activites.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Aucune activité à venir.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activites.map((a) => (
            <div key={a.id} style={{
              padding: '12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'var(--bg)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                <div style={{ fontSize: '14px' }}>{a.description}</div>
                {a.date_activite && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(a.date_activite).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {a.types_activites?.map((t) => (
                  <span key={t} className="badge badge-primary" style={{ fontSize: '11px' }}>{t}</span>
                ))}
                {a.gratuites && a.gratuites !== 'oui' && (
                  <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                    {a.gratuites === 'non' ? 'Payant' : 'Partiellement gratuit'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
