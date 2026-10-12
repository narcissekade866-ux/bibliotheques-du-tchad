import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MapView from '../components/MapView';
import AvisSection from '../components/AvisSection';
import ActivitesSection from '../components/ActivitesSection';
import SignalementForm from '../components/SignalementForm';
import { useLightMode } from '../contexts/LightModeContext';

const JOUR_LABELS = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
};

const STATUT_MAP = {
  fonctionnel: { text: 'En fonctionnement', cls: 'badge-success' },
  non_fonctionnel: { text: 'Non fonctionnel', cls: 'badge-danger' },
  partiellement_fonctionnel: { text: 'Partiellement fonctionnel', cls: 'badge-warning' },
  temporairement_ferme: { text: 'Temporairement fermé', cls: 'badge-neutral' },
};

const TYPE_MAP = {
  publique: 'Publique', universitaire: 'Universitaire', scolaire: 'Scolaire',
  specialisee: 'Spécialisée', communautaire: 'Communautaire', privee: 'Privée',
  associative: 'Associative', autre: 'Autre',
};

const OUI_NON_MAP = { oui: 'Oui', non: 'Non', partiel: 'Partiel', parfois: 'Parfois' };

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div className="section-card">
      <h3 className="section-title">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, suffix }) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <span className="field-value">{display}{suffix || ''}</span>
    </div>
  );
}

function OuiNonRow({ label, value }) {
  if (!value) return null;
  return <Row label={label} value={OUI_NON_MAP[value] || value} />;
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <div className="skeleton skeleton-text" style={{ width: '100px', marginBottom: '24px' }} />
      <div className="skeleton skeleton-title" style={{ width: '60%', height: '32px' }} />
      <div className="skeleton" style={{ width: '40%', height: '16px', marginBottom: '20px' }} />
      <div className="skeleton" style={{ height: '250px', marginBottom: '24px' }} />
      <div className="grid grid-detail">
        {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
    </main>
  );
}

export default function BiblioDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { lightMode } = useLightMode();
  const [biblio, setBiblio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet(`/bibliotheques/${id}`);
        setBiblio(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <DetailSkeleton />;

  if (error) return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <div className="alert alert-error">{error}</div>
    </main>
  );

  if (!biblio) return (
    <main className="container empty-state" style={{ flex: 1 }}>
      <p>Bibliothèque introuvable.</p>
    </main>
  );
  const canEdit = user && ['administrateur', 'responsable_bibliotheque', 'enqueteur'].includes(user.role);
  const loc = biblio.localisation;
  const hasCoords = loc && loc.latitude && loc.longitude;
  const mapLink = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    : null;

  const statut = STATUT_MAP[biblio.statut_fonctionnement] || { text: biblio.statut_fonctionnement, cls: 'badge-neutral' };
  const typeLabel = TYPE_MAP[biblio.type] || biblio.type;
  const locationParts = [loc?.quartier, loc?.subdivision_nom, loc?.ville_nom].filter(Boolean);

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1, maxWidth: '960px' }}>
      <Link to="/recherche" style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <BackIcon /> Retour
      </Link>

      {/* --- Header --- */}
      <div className="detail-header">
        <h1 className="detail-title">{biblio.nom_officiel}</h1>
        {biblio.nom_alternatif && (
          <div className="detail-subtitle">{biblio.nom_alternatif}</div>
        )}
        {locationParts.length > 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapIcon />
            {locationParts.join(', ')}
          </div>
        )}
        <div className="detail-meta">
          {typeLabel && <span className="badge badge-primary">{typeLabel}</span>}
          <span className={`badge ${statut.cls}`}>{statut.text}</span>
          <span className="detail-date">
            Mis à jour le {new Date(biblio.updated_at).toLocaleDateString('fr-FR')}
          </span>
        </div>

        <div className="detail-actions">
          {hasCoords && !lightMode && (
            <Link to={`/?lat=${loc.latitude}&lng=${loc.longitude}`} className="btn btn-secondary btn-sm">
              <MapIcon /> Voir sur la carte
            </Link>
          )}
          {mapLink && (
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="btn btn-accent btn-sm">
              <RouteIcon /> Itinéraire
            </a>
          )}
          {canEdit && (
            <Link to={`/bibliotheque/${id}/modifier`} className="btn btn-ghost btn-sm">
              <EditIcon /> Modifier
            </Link>
          )}
        </div>
      </div>

      {/* --- Map --- */}
      {hasCoords && !lightMode && (
        <div className="map-container" style={{ height: '240px', marginBottom: '28px' }}>
          <MapView
            bibliotheques={[{ ...biblio, latitude: loc.latitude, longitude: loc.longitude }]}
            center={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
            zoom={16}
          />
        </div>
      )}

      {/* --- Info grid --- */}
      <div className="grid grid-detail" style={{ marginBottom: '28px' }}>
        <Section title="Localisation">
          {loc && (
            <>
              <Row label="Ville" value={loc.ville_nom} />
              <Row label="Arrondissement" value={loc.subdivision_nom} />
              <Row label="Quartier" value={loc.quartier} />
              <Row label="Point de repère" value={loc.point_repere} />
              {hasCoords && (
                <Row label="Coordonnées" value={`${parseFloat(loc.latitude).toFixed(6)}, ${parseFloat(loc.longitude).toFixed(6)}`} />
              )}
            </>
          )}
        </Section>

        <Section title="Identification">
          <Row label="Année de création" value={biblio.annee_creation} />
          <Row label="Responsable" value={biblio.responsable_institution} />
          <Row label="Statut" value={statut.text} />
          {biblio.raison_non_fonctionnel && <Row label="Raison" value={biblio.raison_non_fonctionnel} />}
        </Section>

        {biblio.horaires && biblio.horaires.length > 0 && (
          <Section title="Horaires d'ouverture">
            {biblio.horaires.map((h) => (
              <div key={h.jour} className="field-row">
                <span className="field-label" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '14px' }}>
                  {JOUR_LABELS[h.jour]}
                </span>
                <span className="field-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {h.heure_ouverture && h.heure_fermeture
                    ? `${h.heure_ouverture.slice(0, 5)} – ${h.heure_fermeture.slice(0, 5)}`
                    : <span style={{ color: 'var(--text-muted)' }}>Fermé</span>}
                </span>
              </div>
            ))}
            {biblio.horaires[0]?.ouvert_vacances && (
              <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-light)' }}>
                <OuiNonRow label="Ouvert pendant les vacances" value={biblio.horaires[0].ouvert_vacances} />
              </div>
            )}
          </Section>
        )}

        {biblio.conditions_acces && (
          <Section title="Conditions d'accès">
            <OuiNonRow label="Accès gratuit" value={biblio.conditions_acces.acces_gratuit} />
            <Row label="Tarif par visite" value={biblio.conditions_acces.montant_par_visite} suffix=" FCFA" />
            <Row label="Abonnement mensuel" value={biblio.conditions_acces.abonnement_mensuel} suffix=" FCFA" />
            <Row label="Conditions d'inscription" value={biblio.conditions_acces.conditions_inscription} />
            <OuiNonRow label="Consultation sans inscription" value={biblio.conditions_acces.consultation_sans_inscription} />
            <Row label="Conditions élèves/étudiants" value={biblio.conditions_acces.conditions_eleves_etudiants} />
            <Row label="Modes de paiement" value={biblio.conditions_acces.modes_paiement} />
          </Section>
        )}

        {biblio.pret_consultation && (
          <Section title="Prêt et consultation">
            <Row label="Lecture sur place" value={biblio.pret_consultation.lecture_sur_place ? 'Oui' : undefined} />
            <OuiNonRow label="Emprunt à domicile" value={biblio.pret_consultation.emprunt_domicile} />
            <Row label="Livres empruntables (max)" value={biblio.pret_consultation.nb_max_livres_empruntables} />
            <Row label="Durée max du prêt" value={biblio.pret_consultation.duree_max_pret} />
            <Row label="Pénalités de retard" value={biblio.pret_consultation.penalites_retard} />
            <Row label="Système de suivi" value={biblio.pret_consultation.systeme_suivi_prets} />
          </Section>
        )}

        {biblio.public_frequentation && (
          <Section title="Public et fréquentation">
            <Row label="Public cible" value={biblio.public_frequentation.public_cible} />
            <Row label="Fréquentation / jour" value={biblio.public_frequentation.frequentation_moyenne_jour} />
            <Row label="Fréquentation / semaine" value={biblio.public_frequentation.frequentation_moyenne_semaine} />
            <OuiNonRow label="Accessible PMR" value={biblio.public_frequentation.accessible_handicap} />
          </Section>
        )}

        {biblio.collection_catalogue && (
          <Section title="Collections et catalogue">
            <Row label="Nombre de livres" value={biblio.collection_catalogue.nb_livres_estime} />
            <Row label="Domaines couverts" value={biblio.collection_catalogue.domaines_couverts} />
            <Row label="Langues disponibles" value={biblio.collection_catalogue.langues_disponibles} />
            <Row label="État des livres" value={biblio.collection_catalogue.etat_des_livres} />
            <OuiNonRow label="Accepte les dons" value={biblio.collection_catalogue.accepte_dons} />
            <Row label="Logiciel de gestion" value={biblio.collection_catalogue.logiciel_gestion} />
          </Section>
        )}

        {biblio.services && (
          <Section title="Services">
            <Row label="Salle de lecture" value={biblio.services.salle_lecture ? `Oui (${biblio.services.nb_places || '?'} places)` : undefined} />
            <Row label="Espaces disponibles" value={biblio.services.espaces_disponibles} />
            <Row label="WiFi gratuit" value={biblio.services.wifi_gratuit ? 'Oui' : undefined} />
            <Row label="Ordinateurs en libre accès" value={biblio.services.ordinateurs_libre_acces ? `Oui (${biblio.services.nb_ordinateurs || '?'})` : undefined} />
            <Row label="Autres services" value={biblio.services.autres_services} />
          </Section>
        )}

        {biblio.communication && (
          <Section title="Contact et communication">
            <Row label="Site web" value={biblio.communication.site_web} />
            <Row label="Email" value={biblio.communication.email_public} />
            <Row label="WhatsApp" value={biblio.communication.whatsapp_public} />
            <Row label="Réseaux sociaux" value={biblio.communication.reseaux_sociaux} />
          </Section>
        )}

        {biblio.infrastructure && (
          <Section title="Infrastructure">
            <Row label="Problèmes matériels" value={biblio.infrastructure.problemes_materiels} />
            <OuiNonRow label="Besoin de réhabilitation" value={biblio.infrastructure.besoin_rehabilitation} />
            <Row label="Travaux nécessaires" value={biblio.infrastructure.types_travaux} />
          </Section>
        )}

        {biblio.besoins_partenariats && (
          <Section title="Besoins et partenariats">
            <Row label="Défis principaux" value={biblio.besoins_partenariats.defis_principaux} />
            <Row label="Types d'appui nécessaire" value={biblio.besoins_partenariats.types_appui_necessaire} />
            <Row label="Appui prioritaire" value={biblio.besoins_partenariats.appui_prioritaire} />
            <Row label="Recherche de partenaires" value={biblio.besoins_partenariats.recherche_partenaires ? 'Oui' : undefined} />
          </Section>
        )}
      </div>

      <ActivitesSection bibliothequeId={id} />

      <div style={{ marginTop: '28px' }}>
        <AvisSection bibliothequeId={id} />
      </div>

      <SignalementButton bibliothequeId={id} />
    </main>
  );
}

function SignalementButton({ bibliothequeId }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return <SignalementForm bibliothequeId={bibliothequeId} onClose={() => setOpen(false)} />;
  }

  return (
    <div style={{ marginTop: '24px', textAlign: 'center', paddingBottom: '8px' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Signaler une erreur sur cette fiche
      </button>
    </div>
  );
}
