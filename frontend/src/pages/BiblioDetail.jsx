import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import MapView from '../components/MapView';
import AvisSection from '../components/AvisSection';
import SignalementForm from '../components/SignalementForm';
import { useLightMode } from '../contexts/LightModeContext';

const JOUR_LABELS = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
};

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div className="section-card">
      <h3 className="section-title">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div className="field-value">
      <div className="field-label">{label}</div>
      <div>{display}</div>
    </div>
  );
}

function OuiNonField({ label, value }) {
  if (!value) return null;
  const display = { oui: 'Oui', non: 'Non', partiel: 'Partiel', parfois: 'Parfois' };
  return <Field label={label} value={display[value] || value} />;
}

function DetailSkeleton() {
  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <div className="skeleton skeleton-text" style={{ width: '80px', marginBottom: '20px' }} />
      <div className="skeleton skeleton-title" style={{ width: '60%' }} />
      <div className="skeleton" style={{ height: '250px', marginBottom: '20px' }} />
      <div className="grid grid-detail">
        {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
    </main>
  );
}

export default function BiblioDetail() {
  const { id } = useParams();
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

  const { lightMode } = useLightMode();
  const loc = biblio.localisation;
  const hasCoords = loc && loc.latitude && loc.longitude;
  const mapLink = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    : null;

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <Link to="/" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        &larr; Retour à la carte
      </Link>

      <div className="detail-header">
        <h1 className="detail-title">{biblio.nom_officiel}</h1>
        {biblio.nom_alternatif && (
          <div className="detail-subtitle">{biblio.nom_alternatif}</div>
        )}
        <div className="detail-meta">
          {biblio.type && <span className="badge badge-primary">{biblio.type}</span>}
          <span className="detail-date">
            Mis à jour le {new Date(biblio.updated_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {hasCoords && !lightMode && (
        <div className="map-container" style={{ height: '250px', marginBottom: '24px' }}>
          <MapView
            bibliotheques={[{ ...biblio, latitude: loc.latitude, longitude: loc.longitude }]}
            center={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
            zoom={16}
          />
        </div>
      )}

      <div className="grid grid-detail">
        <Section title="Localisation">
          {loc && (
            <>
              <Field label="Ville" value={loc.ville_nom} />
              <Field label="Arrondissement" value={loc.subdivision_nom} />
              <Field label="Quartier" value={loc.quartier} />
              <Field label="Point de repère" value={loc.point_repere} />
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noopener noreferrer"
                   className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
                  Itinéraire
                </a>
              )}
            </>
          )}
        </Section>

        <Section title="Identification">
          <Field label="Année de création" value={biblio.annee_creation} />
          <Field label="Responsable" value={biblio.responsable_institution} />
          <Field label="Statut" value={{
            fonctionnel: 'En fonctionnement',
            non_fonctionnel: 'Non fonctionnel',
            partiellement_fonctionnel: 'Partiellement fonctionnel',
            temporairement_ferme: 'Temporairement fermé',
          }[biblio.statut_fonctionnement] || biblio.statut_fonctionnement} />
          {biblio.raison_non_fonctionnel && <Field label="Raison" value={biblio.raison_non_fonctionnel} />}
        </Section>

        {biblio.horaires && biblio.horaires.length > 0 && (
          <Section title="Horaires">
            <table>
              <tbody>
                {biblio.horaires.map((h) => (
                  <tr key={h.jour}>
                    <td style={{ fontWeight: 500, paddingLeft: 0 }}>{JOUR_LABELS[h.jour]}</td>
                    <td style={{ textAlign: 'right', paddingRight: 0, color: 'var(--text-secondary)' }}>
                      {h.heure_ouverture && h.heure_fermeture
                        ? `${h.heure_ouverture.slice(0, 5)} – ${h.heure_fermeture.slice(0, 5)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {biblio.horaires[0]?.ouvert_vacances && (
              <div style={{ marginTop: '12px' }}>
                <OuiNonField label="Ouvert pendant les vacances" value={biblio.horaires[0].ouvert_vacances} />
              </div>
            )}
          </Section>
        )}

        {biblio.conditions_acces && (
          <Section title="Conditions d'accès">
            <OuiNonField label="Accès gratuit" value={biblio.conditions_acces.acces_gratuit} />
            <Field label="Tarif par visite" value={biblio.conditions_acces.montant_par_visite && `${biblio.conditions_acces.montant_par_visite} FCFA`} />
            <Field label="Abonnement mensuel" value={biblio.conditions_acces.abonnement_mensuel && `${biblio.conditions_acces.abonnement_mensuel} FCFA`} />
            <Field label="Conditions d'inscription" value={biblio.conditions_acces.conditions_inscription} />
            <OuiNonField label="Consultation sans inscription" value={biblio.conditions_acces.consultation_sans_inscription} />
            <Field label="Conditions élèves/étudiants" value={biblio.conditions_acces.conditions_eleves_etudiants} />
            <Field label="Modes de paiement" value={biblio.conditions_acces.modes_paiement} />
          </Section>
        )}

        {biblio.pret_consultation && (
          <Section title="Prêt et consultation">
            <Field label="Lecture sur place" value={biblio.pret_consultation.lecture_sur_place ? 'Oui' : 'Non'} />
            <OuiNonField label="Emprunt à domicile" value={biblio.pret_consultation.emprunt_domicile} />
            <Field label="Livres empruntables (max)" value={biblio.pret_consultation.nb_max_livres_empruntables} />
            <Field label="Durée max du prêt" value={biblio.pret_consultation.duree_max_pret} />
            <Field label="Pénalités de retard" value={biblio.pret_consultation.penalites_retard} />
          </Section>
        )}

        {biblio.public_frequentation && (
          <Section title="Public et fréquentation">
            <Field label="Public cible" value={biblio.public_frequentation.public_cible} />
            <Field label="Fréquentation moyenne/jour" value={biblio.public_frequentation.frequentation_moyenne_jour} />
            <Field label="Fréquentation moyenne/semaine" value={biblio.public_frequentation.frequentation_moyenne_semaine} />
            <OuiNonField label="Accessible aux personnes handicapées" value={biblio.public_frequentation.accessible_handicap} />
          </Section>
        )}

        {biblio.collection_catalogue && (
          <Section title="Collections et catalogue">
            <Field label="Nombre de livres (estimé)" value={biblio.collection_catalogue.nb_livres_estime} />
            <Field label="Domaines couverts" value={biblio.collection_catalogue.domaines_couverts} />
            <Field label="Langues disponibles" value={biblio.collection_catalogue.langues_disponibles} />
            <Field label="État des livres" value={biblio.collection_catalogue.etat_des_livres} />
            <OuiNonField label="Accepte les dons" value={biblio.collection_catalogue.accepte_dons} />
            <Field label="Logiciel de gestion" value={biblio.collection_catalogue.logiciel_gestion} />
          </Section>
        )}

        {biblio.services && (
          <Section title="Services">
            <Field label="Salle de lecture" value={biblio.services.salle_lecture ? `Oui (${biblio.services.nb_places || '?'} places)` : null} />
            <Field label="Espaces disponibles" value={biblio.services.espaces_disponibles} />
            <Field label="WiFi gratuit" value={biblio.services.wifi_gratuit ? 'Oui' : null} />
            <Field label="Ordinateurs en libre accès" value={biblio.services.ordinateurs_libre_acces ? `Oui (${biblio.services.nb_ordinateurs || '?'})` : null} />
            <Field label="Autres services" value={biblio.services.autres_services} />
          </Section>
        )}

        {biblio.communication && (
          <Section title="Contact">
            <Field label="Site web" value={biblio.communication.site_web} />
            <Field label="Email" value={biblio.communication.email_public} />
            <Field label="WhatsApp" value={biblio.communication.whatsapp_public} />
            <Field label="Réseaux sociaux" value={biblio.communication.reseaux_sociaux} />
          </Section>
        )}

        {biblio.besoins_partenariats && (
          <Section title="Besoins et partenariats">
            <Field label="Défis principaux" value={biblio.besoins_partenariats.defis_principaux} />
            <Field label="Types d'appui nécessaire" value={biblio.besoins_partenariats.types_appui_necessaire} />
            <Field label="Appui prioritaire" value={biblio.besoins_partenariats.appui_prioritaire} />
            <Field label="Recherche de partenaires" value={biblio.besoins_partenariats.recherche_partenaires ? 'Oui' : null} />
          </Section>
        )}
      </div>

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
    <div style={{ marginTop: '20px', textAlign: 'center' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Signaler une erreur sur cette fiche
      </button>
    </div>
  );
}
