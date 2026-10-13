import { Link } from 'react-router-dom';

const TYPE_LABELS = {
  publique: 'Publique', universitaire: 'Universitaire', scolaire: 'Scolaire',
  specialisee: 'Spécialisée', communautaire: 'Communautaire', privee: 'Privée',
  associative: 'Associative', autre: 'Autre',
};

const STATUT_LABELS = {
  fonctionnel: { text: 'En fonctionnement', cls: 'badge-success' },
  partiellement_fonctionnel: { text: 'Partiel', cls: 'badge-warning' },
  non_fonctionnel: { text: 'Non fonctionnel', cls: 'badge-danger' },
  temporairement_ferme: { text: 'Fermé temp.', cls: 'badge-neutral' },
};

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export default function BiblioCard({ biblio }) {
  const statut = STATUT_LABELS[biblio.statut_fonctionnement];
  const locationParts = [biblio.quartier, biblio.ville_nom].filter(Boolean).join(', ');

  return (
    <Link to={`/bibliotheque/${biblio.id}`} className="card card-interactive card-link">
      <h3 style={{
        margin: '0 0 6px', fontSize: '15px', fontWeight: 600, color: 'var(--text)',
        overflow: 'hidden', textOverflow: 'ellipsis',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
      }}>
        {biblio.nom_officiel}
      </h3>
      {locationParts && (
        <div style={{
          fontSize: '13px', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', gap: '5px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <PinIcon />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{locationParts}</span>
        </div>
      )}
      <div style={{
        display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '12px',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {biblio.type && (
          <span className="badge badge-primary">
            {TYPE_LABELS[biblio.type] || biblio.type}
          </span>
        )}
        {statut && biblio.statut_fonctionnement !== 'fonctionnel' && (
          <span className={`badge ${statut.cls}`}>{statut.text}</span>
        )}
        {biblio.distance_m != null && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {biblio.distance_m < 1000
              ? `${Math.round(biblio.distance_m)} m`
              : `${(biblio.distance_m / 1000).toFixed(1)} km`}
          </span>
        )}
      </div>
    </Link>
  );
}
