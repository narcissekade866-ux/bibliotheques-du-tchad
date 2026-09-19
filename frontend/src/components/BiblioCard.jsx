import { Link } from 'react-router-dom';

const TYPE_LABELS = {
  publique: 'Publique',
  universitaire: 'Universitaire',
  scolaire: 'Scolaire',
  specialisee: 'Spécialisée',
  communautaire: 'Communautaire',
  privee: 'Privée',
  associative: 'Associative',
  autre: 'Autre',
};

export default function BiblioCard({ biblio }) {
  return (
    <Link
      to={`/bibliotheque/${biblio.id}`}
      style={{
        display: 'block',
        padding: '16px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        textDecoration: 'none',
        color: 'inherit',
        background: 'var(--bg)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <h3 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: '16px' }}>
        {biblio.nom_officiel}
      </h3>
      <div style={{ fontSize: '14px', color: 'var(--text-light)' }}>
        {biblio.quartier && <span>{biblio.quartier}, </span>}
        {biblio.ville_nom && <span>{biblio.ville_nom}</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
        {biblio.type && (
          <span style={{
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
          }}>
            {TYPE_LABELS[biblio.type] || biblio.type}
          </span>
        )}
        {biblio.distance_m != null && (
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            {biblio.distance_m < 1000
              ? `${Math.round(biblio.distance_m)} m`
              : `${(biblio.distance_m / 1000).toFixed(1)} km`}
          </span>
        )}
      </div>
    </Link>
  );
}
