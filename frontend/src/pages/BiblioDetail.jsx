import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../services/api';
import MapView from '../components/MapView';

const JOUR_LABELS = {
  lundi: 'Lundi', mardi: 'Mardi', mercredi: 'Mercredi',
  jeudi: 'Jeudi', vendredi: 'Vendredi', samedi: 'Samedi', dimanche: 'Dimanche',
};

function Section({ title, children }) {
  if (!children) return null;
  return (
    <section style={{
      padding: '16px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      background: 'var(--bg)',
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--primary)' }}>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <div style={{ marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-light)' }}>{label}</span>
      <div>{display}</div>
    </div>
  );
}

function OuiNonField({ label, value }) {
  if (!value) return null;
  const display = { oui: 'Oui', non: 'Non', partiel: 'Partiel', parfois: 'Parfois' };
  return <Field label={label} value={display[value] || value} />;
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

  if (loading) return <main className="container" style={{ padding: '24px 16px' }}><p>Chargement...</p></main>;
  if (error) return <main className="container" style={{ padding: '24px 16px' }}><p>{error}</p></main>;
  if (!biblio) return <main className="container" style={{ padding: '24px 16px' }}><p>Bibliothèque introuvable.</p></main>;

  const loc = biblio.localisation;
  const hasCoords = loc && loc.latitude && loc.longitude;
  const mapLink = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`
    : null;

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <Link to="/" style={{ fontSize: '14px' }}>&larr; Retour à la carte</Link>

      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px' }}>{biblio.nom_officiel}</h1>
        {biblio.nom_alternatif && (
          <div style={{ color: 'var(--text-light)', fontSize: '14px' }}>{biblio.nom_alternatif}</div>
        )}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {biblio.type && (
            <span style={{
              fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
              background: 'var(--primary-light)', color: 'var(--primary)',
            }}>
              {biblio.type}
            </span>
          )}
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Mis à jour le {new Date(biblio.updated_at).toLocaleDateString('fr-FR')}
          </span>
        </div>
      </div>

      {hasCoords && (
        <div style={{ height: '250px', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '16px' }}>
          <MapView
            bibliotheques={[{ ...biblio, latitude: loc.latitude, longitude: loc.longitude }]}
            center={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
            zoom={16}
          />
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        <Section title="Localisation">
          {loc && (
            <>
              <Field label="Ville" value={loc.ville_nom} />
              <Field label="Arrondissement" value={loc.subdivision_nom} />
              <Field label="Quartier" value={loc.quartier} />
              <Field label="Point de repère" value={loc.point_repere} />
              {mapLink && (
                <a href={mapLink} target="_blank" rel="noopener noreferrer"
                   className="btn btn-primary" style={{ display: 'inline-block', marginTop: '8px', fontSize: '14px', textDecoration: 'none' }}>
                  Itinéraire
                </a>
              )}
            </>
          )}
        </Section>

        <Section title="Identification">
          <Field label="Année de création" value={biblio.annee_creation} />
          <Field label="Responsable" value={biblio.responsable_institution} />
          <Field label="Statut" value={biblio.statut_fonctionnement === 'fonctionnel' ? 'En fonctionnement' : biblio.statut_fonctionnement} />
          {biblio.raison_non_fonctionnel && <Field label="Raison" value={biblio.raison_non_fonctionnel} />}
        </Section>

        {biblio.horaires && biblio.horaires.length > 0 && (
          <Section title="Horaires">
            <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
              <tbody>
                {biblio.horaires.map((h) => (
                  <tr key={h.jour} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 0', fontWeight: 500 }}>{JOUR_LABELS[h.jour]}</td>
                    <td style={{ padding: '4px 0', textAlign: 'right' }}>
                      {h.heure_ouverture && h.heure_fermeture
                        ? `${h.heure_ouverture.slice(0, 5)} - ${h.heure_fermeture.slice(0, 5)}`
                        : 'Non renseigné'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {biblio.horaires[0]?.ouvert_vacances && (
              <OuiNonField label="Ouvert pendant les vacances" value={biblio.horaires[0].ouvert_vacances} />
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
    </main>
  );
}
