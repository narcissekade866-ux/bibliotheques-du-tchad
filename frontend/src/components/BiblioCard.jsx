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
    <Link to={`/bibliotheque/${biblio.id}`} className="card card-interactive card-link">
      <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600 }}>
        {biblio.nom_officiel}
      </h3>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
        {biblio.quartier && <span>{biblio.quartier}, </span>}
        {biblio.ville_nom && <span>{biblio.ville_nom}</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {biblio.type && (
          <span className="badge badge-primary">
            {TYPE_LABELS[biblio.type] || biblio.type}
          </span>
        )}
        {biblio.distance_m != null && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {biblio.distance_m < 1000
              ? `${Math.round(biblio.distance_m)} m`
              : `${(biblio.distance_m / 1000).toFixed(1)} km`}
          </span>
        )}
      </div>
    </Link>
  );
}
