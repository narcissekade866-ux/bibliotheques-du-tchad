import { useState, useEffect } from 'react';
import { apiGet } from '../services/api';

function Bar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: 'var(--primary)',
          borderRadius: '3px', transition: 'width 600ms ease',
        }} />
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <main className="container" style={{ padding: '32px 16px', flex: 1 }}>
      <div className="skeleton skeleton-title" />
      <div className="grid grid-stats" style={{ marginBottom: '28px' }}>
        {[1,2].map(i => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
      </div>
      <div className="grid grid-detail">
        {[1,2].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
    </main>
  );
}

export default function Stats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet('/stats')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <StatsSkeleton />;

  if (!data) return (
    <main className="container" style={{ padding: '32px 16px', flex: 1 }}>
      <div className="alert alert-error">Impossible de charger les statistiques.</div>
    </main>
  );

  const maxType = Math.max(...data.par_type.map((t) => t.total), 1);
  const maxVille = Math.max(...data.par_ville.map((v) => v.total), 1);

  return (
    <main className="container" style={{ padding: '32px 16px', flex: 1 }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 28px' }}>Statistiques</h1>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', marginBottom: '32px' }}>
        <div className="stat-card" style={{ background: 'var(--primary-light)' }}>
          <div className="stat-value">{data.bibliotheques_total}</div>
          <div className="stat-label">bibliothèques référencées</div>
        </div>

        {data.avis.total > 0 && (
          <div className="stat-card" style={{ background: 'var(--accent-light)' }}>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>
              {data.avis.moyenne}/5
            </div>
            <div className="stat-label">note moyenne ({data.avis.total} avis)</div>
          </div>
        )}
      </div>

      <div className="grid grid-detail">
        {data.par_type.length > 0 && (
          <div className="section-card">
            <h3 className="section-title">Par type</h3>
            {data.par_type.map((t) => (
              <Bar key={t.type} label={t.type} value={t.total} max={maxType} />
            ))}
          </div>
        )}

        {data.par_ville.length > 0 && (
          <div className="section-card">
            <h3 className="section-title">Par ville</h3>
            {data.par_ville.map((v) => (
              <Bar key={v.ville} label={v.ville} value={v.total} max={maxVille} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
