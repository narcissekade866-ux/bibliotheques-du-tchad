import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../services/api';
import { saveDraft, getAllDrafts, deleteDraft, markSynced } from '../services/offlineDb';

const JOURS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const JOUR_LABELS = { lundi:'Lundi', mardi:'Mardi', mercredi:'Mercredi', jeudi:'Jeudi', vendredi:'Vendredi', samedi:'Samedi', dimanche:'Dimanche' };

const TYPES_BIBLIO = [
  { v:'publique', l:'Publique' }, { v:'universitaire', l:'Universitaire' },
  { v:'scolaire', l:'Scolaire' }, { v:'specialisee', l:'Spécialisée' },
  { v:'communautaire', l:'Communautaire' }, { v:'privee', l:'Privée' },
  { v:'associative', l:'Associative' }, { v:'autre', l:'Autre' },
];

const OUI_NON_PARTIEL = [{ v:'oui', l:'Oui'}, { v:'non', l:'Non'}, { v:'partiel', l:'Partiel'}];
const OUI_NON_PARFOIS = [{ v:'oui', l:'Oui'}, { v:'non', l:'Non'}, { v:'parfois', l:'Parfois'}];

const SECTIONS = [
  { id:'repondant', label:'A — Répondant' },
  { id:'identification', label:'B — Identification' },
  { id:'localisation', label:'C — Localisation & GPS' },
  { id:'horaires', label:'D — Horaires' },
  { id:'acces', label:'E — Conditions d\'accès' },
  { id:'pret', label:'F — Prêt et consultation' },
  { id:'public', label:'G — Public et fréquentation' },
  { id:'collection', label:'H/I — Collections et catalogue' },
  { id:'services', label:'J — Services' },
  { id:'activites', label:'K — Activités' },
  { id:'infrastructure', label:'M — Infrastructure' },
  { id:'communication', label:'N — Communication' },
  { id:'besoins', label:'O — Besoins et partenariats' },
];

function emptyForm() {
  const horaires = {};
  JOURS.forEach(j => { horaires[j] = { ouverture:'', fermeture:'' }; });
  return {
    enquete_repondant_nom:'', enquete_repondant_fonction:'', enquete_repondant_contact:'',
    consentement_utilisation: false,
    nom_officiel:'', nom_alternatif:'', type:'', annee_creation:'',
    responsable_institution:'', statut_fonctionnement:'fonctionnel', raison_non_fonctionnel:'',
    ville_id:'', subdivision_id:'', quartier:'', point_repere:'',
    latitude:'', longitude:'', precision_gps_m:'',
    horaires, horaires_variables: false, ouvert_vacances:'', periodes_fermeture:'',
    acces_gratuit:'', montant_par_visite:'', abonnement_mensuel:'',
    conditions_inscription:'', consultation_sans_inscription:'',
    conditions_eleves_etudiants:'', modes_paiement:'',
    lecture_sur_place: false, emprunt_domicile:'', nb_max_livres_empruntables:'',
    duree_max_pret:'', penalites_retard:'', systeme_suivi_prets:'',
    public_cible:'', frequentation_moyenne_jour:'', frequentation_moyenne_semaine:'',
    accessible_handicap:'',
    nb_livres_estime:'', domaines_couverts:'', langues_disponibles:'',
    etat_des_livres:'', accepte_dons:'', logiciel_gestion:'',
    salle_lecture: false, nb_places:'', wifi_gratuit: false,
    ordinateurs_libre_acces: false, nb_ordinateurs:'', autres_services:'',
    organise_activites: false, types_activites:'', frequence_activites:'',
    gratuites_activites:'',
    problemes_materiels:'', besoin_rehabilitation:'', types_travaux:'',
    site_web:'', whatsapp_public:'', email_public:'', reseaux_sociaux:'',
    interesse_fiche_numerique:'',
    defis_principaux:'', types_appui_necessaire:'', appui_prioritaire:'',
    a_deja_recu_appui: false, partenaire_precedent:'',
    recherche_partenaires: false, type_partenariat_souhaite:'',
  };
}

function GpsCapture({ onCapture, latitude, longitude, precision }) {
  const [status, setStatus] = useState('idle');
  const [currentAccuracy, setCurrentAccuracy] = useState(null);
  const watchRef = useRef(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      return;
    }
    setStatus('acquiring');
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        setCurrentAccuracy(acc);
        onCapture(
          pos.coords.latitude.toFixed(6),
          pos.coords.longitude.toFixed(6),
          acc
        );
        if (acc <= 10) {
          setStatus('locked');
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      },
      (err) => {
        const msgs = { 1:'Permission GPS refusée', 2:'Position indisponible', 3:'Délai dépassé' };
        setStatus('error');
        setCurrentAccuracy(null);
        console.warn(msgs[err.code] || 'Erreur GPS');
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
  }, [onCapture]);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  return (
    <div className="section-card" style={{ marginBottom:'12px', padding:'18px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
        <button type="button" className="btn btn-accent btn-sm" onClick={start}
          disabled={status === 'acquiring' || status === 'locked'}>
          {status === 'acquiring' ? 'Acquisition en cours…' : status === 'locked' ? 'Position verrouillée' : 'Capturer la position GPS'}
        </button>
        {currentAccuracy != null && (
          <span className={`badge ${currentAccuracy <= 10 ? 'badge-success' : currentAccuracy <= 30 ? 'badge-warning' : 'badge-danger'}`}>
            {currentAccuracy} m
          </span>
        )}
      </div>

      {status === 'acquiring' && (
        <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:0 }}>
          Restez immobile. La capture se verrouille automatiquement quand la précision atteint 10 m.
        </p>
      )}
      {status === 'locked' && (
        <div className="alert alert-success" style={{ margin:0, padding:'8px 12px', fontSize:'13px' }}>
          Position GPS verrouillée avec une précision de {currentAccuracy} m.
        </div>
      )}
      {status === 'error' && (
        <div className="alert alert-error" style={{ margin:0, padding:'8px 12px', fontSize:'13px' }}>
          Impossible d'obtenir la position. Vérifiez les permissions GPS et réessayez.
        </div>
      )}
      {status === 'unsupported' && (
        <div className="alert alert-error" style={{ margin:0, padding:'8px 12px', fontSize:'13px' }}>
          La géolocalisation n'est pas supportée par ce navigateur.
        </div>
      )}

      {latitude && (
        <div style={{ display:'flex', gap:'16px', marginTop:'12px', fontSize:'13px', color:'var(--text-secondary)' }}>
          <span>Lat : {latitude}</span>
          <span>Long : {longitude}</span>
          <span>Précision : {precision} m</span>
        </div>
      )}
    </div>
  );
}

function Select3({ value, onChange, options, label }) {
  return (
    <label>
      {label}
      <select value={value || ''} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">— Sélectionner —</option>
        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

export default function SaisieTerrain() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [villes, setVilles] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [feedback, setFeedback] = useState({ text:'', type:'' });
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('repondant');
  const [tab, setTab] = useState('form');

  useEffect(() => {
    if (!authLoading && !user) navigate('/connexion');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    apiGet('/villes').then(setVilles).catch(() => {});
    loadDrafts();
  }, []);

  useEffect(() => {
    if (!form.ville_id) { setSubdivisions([]); return; }
    apiGet(`/villes/${form.ville_id}/subdivisions`)
      .then(setSubdivisions)
      .catch(() => setSubdivisions([]));
  }, [form.ville_id]);

  async function loadDrafts() {
    try {
      const all = await getAllDrafts();
      setDrafts(all.filter(d => !d.synced));
    } catch { setDrafts([]); }
  }

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setHoraire(jour, field, value) {
    setForm(prev => ({
      ...prev,
      horaires: { ...prev.horaires, [jour]: { ...prev.horaires[jour], [field]: value } },
    }));
  }

  function handleGpsCapture(lat, lng, acc) {
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng, precision_gps_m: String(acc) }));
  }

  function buildPayload(d) {
    const p = {
      nom_officiel: d.nom_officiel,
      nom_alternatif: d.nom_alternatif || undefined,
      type: d.type || undefined,
      annee_creation: d.annee_creation ? parseInt(d.annee_creation, 10) : undefined,
      responsable_institution: d.responsable_institution || undefined,
      statut_fonctionnement: d.statut_fonctionnement || undefined,
      raison_non_fonctionnel: d.raison_non_fonctionnel || undefined,
      enquete_repondant_nom: d.enquete_repondant_nom || undefined,
      enquete_repondant_fonction: d.enquete_repondant_fonction || undefined,
      enquete_repondant_contact: d.enquete_repondant_contact || undefined,
      consentement_utilisation: d.consentement_utilisation || undefined,
    };

    if (d.ville_id) {
      p.localisation = {
        ville_id: d.ville_id,
        subdivision_id: d.subdivision_id || undefined,
        quartier: d.quartier || undefined,
        point_repere: d.point_repere || undefined,
        latitude: d.latitude ? parseFloat(d.latitude) : undefined,
        longitude: d.longitude ? parseFloat(d.longitude) : undefined,
        precision_gps_m: d.precision_gps_m ? parseFloat(d.precision_gps_m) : undefined,
      };
    }

    const hrs = [];
    JOURS.forEach(j => {
      if (d.horaires[j]?.ouverture || d.horaires[j]?.fermeture) {
        hrs.push({
          jour: j,
          heure_ouverture: d.horaires[j].ouverture || undefined,
          heure_fermeture: d.horaires[j].fermeture || undefined,
          horaires_variables: d.horaires_variables || undefined,
          ouvert_vacances: d.ouvert_vacances || undefined,
          periodes_fermeture: d.periodes_fermeture || undefined,
        });
      }
    });
    if (hrs.length > 0) p.horaires = hrs;

    const ca = {};
    if (d.acces_gratuit) ca.acces_gratuit = d.acces_gratuit;
    if (d.montant_par_visite) ca.montant_par_visite = parseFloat(d.montant_par_visite);
    if (d.abonnement_mensuel) ca.abonnement_mensuel = parseFloat(d.abonnement_mensuel);
    if (d.conditions_inscription) ca.conditions_inscription = d.conditions_inscription.split(',').map(s => s.trim()).filter(Boolean);
    if (d.consultation_sans_inscription) ca.consultation_sans_inscription = d.consultation_sans_inscription;
    if (d.conditions_eleves_etudiants) ca.conditions_eleves_etudiants = d.conditions_eleves_etudiants;
    if (d.modes_paiement) ca.modes_paiement = d.modes_paiement.split(',').map(s => s.trim()).filter(Boolean);
    if (Object.keys(ca).length) p.conditions_acces = ca;

    const pr = {};
    if (d.lecture_sur_place) pr.lecture_sur_place = d.lecture_sur_place;
    if (d.emprunt_domicile) pr.emprunt_domicile = d.emprunt_domicile;
    if (d.nb_max_livres_empruntables) pr.nb_max_livres_empruntables = parseInt(d.nb_max_livres_empruntables, 10);
    if (d.duree_max_pret) pr.duree_max_pret = d.duree_max_pret;
    if (d.penalites_retard) pr.penalites_retard = d.penalites_retard;
    if (d.systeme_suivi_prets) pr.systeme_suivi_prets = d.systeme_suivi_prets;
    if (Object.keys(pr).length) p.pret_consultation = pr;

    const pf = {};
    if (d.public_cible) pf.public_cible = d.public_cible.split(',').map(s => s.trim()).filter(Boolean);
    if (d.frequentation_moyenne_jour) pf.frequentation_moyenne_jour = parseInt(d.frequentation_moyenne_jour, 10);
    if (d.frequentation_moyenne_semaine) pf.frequentation_moyenne_semaine = parseInt(d.frequentation_moyenne_semaine, 10);
    if (d.accessible_handicap) pf.accessible_handicap = d.accessible_handicap;
    if (Object.keys(pf).length) p.public_frequentation = pf;

    const cc = {};
    if (d.nb_livres_estime) cc.nb_livres_estime = parseInt(d.nb_livres_estime, 10);
    if (d.domaines_couverts) cc.domaines_couverts = d.domaines_couverts.split(',').map(s => s.trim()).filter(Boolean);
    if (d.langues_disponibles) cc.langues_disponibles = d.langues_disponibles.split(',').map(s => s.trim()).filter(Boolean);
    if (d.etat_des_livres) cc.etat_des_livres = d.etat_des_livres;
    if (d.accepte_dons) cc.accepte_dons = d.accepte_dons;
    if (d.logiciel_gestion) cc.logiciel_gestion = d.logiciel_gestion;
    if (Object.keys(cc).length) p.collection_catalogue = cc;

    const sv = {};
    if (d.salle_lecture) sv.salle_lecture = d.salle_lecture;
    if (d.nb_places) sv.nb_places = parseInt(d.nb_places, 10);
    if (d.wifi_gratuit) sv.wifi_gratuit = d.wifi_gratuit;
    if (d.ordinateurs_libre_acces) sv.ordinateurs_libre_acces = d.ordinateurs_libre_acces;
    if (d.nb_ordinateurs) sv.nb_ordinateurs = parseInt(d.nb_ordinateurs, 10);
    if (d.autres_services) sv.autres_services = d.autres_services;
    if (Object.keys(sv).length) p.services = sv;

    const act = {};
    if (d.organise_activites) act.organise_activites = d.organise_activites;
    if (d.types_activites) act.types_activites = d.types_activites.split(',').map(s => s.trim()).filter(Boolean);
    if (d.frequence_activites) act.frequence = d.frequence_activites;
    if (d.gratuites_activites) act.gratuites = d.gratuites_activites;
    if (Object.keys(act).length) p.activite = act;

    const inf = {};
    if (d.problemes_materiels) inf.problemes_materiels = d.problemes_materiels.split(',').map(s => s.trim()).filter(Boolean);
    if (d.besoin_rehabilitation) inf.besoin_rehabilitation = d.besoin_rehabilitation;
    if (d.types_travaux) inf.types_travaux = d.types_travaux;
    if (Object.keys(inf).length) p.infrastructure = inf;

    const com = {};
    if (d.site_web) com.site_web = d.site_web;
    if (d.whatsapp_public) com.whatsapp_public = d.whatsapp_public;
    if (d.email_public) com.email_public = d.email_public;
    if (d.reseaux_sociaux) com.reseaux_sociaux = d.reseaux_sociaux.split(',').map(s => s.trim()).filter(Boolean);
    if (d.interesse_fiche_numerique) com.interesse_fiche_numerique = d.interesse_fiche_numerique;
    if (Object.keys(com).length) p.communication = com;

    const bp = {};
    if (d.defis_principaux) bp.defis_principaux = d.defis_principaux;
    if (d.types_appui_necessaire) bp.types_appui_necessaire = d.types_appui_necessaire.split(',').map(s => s.trim()).filter(Boolean);
    if (d.appui_prioritaire) bp.appui_prioritaire = d.appui_prioritaire;
    if (d.a_deja_recu_appui) bp.a_deja_recu_appui = d.a_deja_recu_appui;
    if (d.partenaire_precedent) bp.partenaire_precedent = d.partenaire_precedent;
    if (d.recherche_partenaires) bp.recherche_partenaires = d.recherche_partenaires;
    if (d.type_partenariat_souhaite) bp.type_partenariat_souhaite = d.type_partenariat_souhaite.split(',').map(s => s.trim()).filter(Boolean);
    if (Object.keys(bp).length) p.besoins_partenariats = bp;

    return p;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom_officiel.trim()) {
      setFeedback({ text:'Le nom officiel est obligatoire', type:'error' });
      return;
    }
    if (online) {
      setSubmitting(true);
      try {
        await apiPost('/bibliotheques', buildPayload(form));
        setFeedback({ text:'Fiche envoyée avec succès (en attente de validation)', type:'success' });
        setForm(emptyForm());
        setActiveSection('repondant');
      } catch (err) { setFeedback({ text: err.message, type:'error' }); }
      setSubmitting(false);
    } else {
      try {
        await saveDraft(form);
        setFeedback({ text:'Brouillon sauvegardé hors-ligne', type:'success' });
        setForm(emptyForm());
        loadDrafts();
      } catch { setFeedback({ text:'Erreur sauvegarde locale', type:'error' }); }
    }
  }

  async function handleSaveDraft() {
    if (!form.nom_officiel.trim()) { setFeedback({ text:'Nom officiel requis', type:'error' }); return; }
    try {
      await saveDraft(form);
      setFeedback({ text:'Brouillon sauvegardé', type:'success' });
      setForm(emptyForm());
      loadDrafts();
    } catch { setFeedback({ text:'Erreur', type:'error' }); }
  }

  async function syncDraft(draft) {
    if (!online) { setFeedback({ text:'Pas de connexion', type:'error' }); return; }
    try {
      await apiPost('/bibliotheques', buildPayload(draft));
      await markSynced(draft.id);
      setFeedback({ text:`"${draft.nom_officiel}" synchronisée`, type:'success' });
      loadDrafts();
    } catch (err) { setFeedback({ text: err.message, type:'error' }); }
  }

  async function syncAll() {
    if (!online) { setFeedback({ text:'Pas de connexion', type:'error' }); return; }
    let ok = 0, fail = 0;
    for (const d of drafts) {
      try { await apiPost('/bibliotheques', buildPayload(d)); await markSynced(d.id); ok++; }
      catch { fail++; }
    }
    setFeedback({ text:`${ok} synchronisée(s)${fail ? `, ${fail} erreur(s)` : ''}`, type: fail ? 'error' : 'success' });
    loadDrafts();
  }

  if (authLoading || !user) return null;

  const secIdx = SECTIONS.findIndex(s => s.id === activeSection);

  return (
    <main className="container" style={{ padding:'28px 16px', flex:1, maxWidth:'700px' }}>
      <h1 style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Collecte terrain</h1>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
        <span style={{ width:'10px', height:'10px', borderRadius:'50%', background: online ? '#27ae60' : '#e74c3c', display:'inline-block' }} />
        <span style={{ fontSize:'13px', color:'var(--text-muted)' }}>
          {online ? 'En ligne' : 'Hors-ligne — sauvegarde locale'}
        </span>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'form' ? 'tab-active' : ''}`} onClick={() => setTab('form')}>Formulaire</button>
        <button className={`tab ${tab === 'drafts' ? 'tab-active' : ''}`} onClick={() => setTab('drafts')}>
          Brouillons {drafts.length > 0 && <span className="badge badge-accent" style={{ marginLeft:'6px' }}>{drafts.length}</span>}
        </button>
      </div>

      {feedback.text && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom:'16px' }}>
          {feedback.text}
        </div>
      )}

      {tab === 'form' && (
        <form onSubmit={handleSubmit}>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'24px' }}>
            {SECTIONS.map((s) => (
              <button key={s.id} type="button"
                className={activeSection === s.id ? 'badge badge-primary' : 'badge badge-neutral'}
                style={{ cursor:'pointer', padding:'5px 12px', fontSize:'12px', fontWeight: activeSection === s.id ? 600 : 400 }}
                onClick={() => setActiveSection(s.id)}>
                {s.label}
              </button>
            ))}
          </div>

          {activeSection === 'repondant' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>A — Informations sur le répondant</legend>
              <label>Nom du répondant <input type="text" value={form.enquete_repondant_nom} onChange={e => set('enquete_repondant_nom', e.target.value)} /></label>
              <label>Fonction <input type="text" value={form.enquete_repondant_fonction} onChange={e => set('enquete_repondant_fonction', e.target.value)} /></label>
              <label>Contact <input type="text" value={form.enquete_repondant_contact} onChange={e => set('enquete_repondant_contact', e.target.value)} /></label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
                <input type="checkbox" checked={form.consentement_utilisation} onChange={e => set('consentement_utilisation', e.target.checked)} style={{ width:'auto' }} />
                Consentement à l'utilisation des données
              </label>
            </fieldset>
          )}

          {activeSection === 'identification' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>B — Identification</legend>
              <label>Nom officiel * <input type="text" value={form.nom_officiel} onChange={e => set('nom_officiel', e.target.value)} required /></label>
              <label>Nom alternatif <input type="text" value={form.nom_alternatif} onChange={e => set('nom_alternatif', e.target.value)} /></label>
              <Select3 label="Type de bibliothèque" value={form.type} onChange={v => set('type', v)} options={TYPES_BIBLIO} />
              <label>Année de création <input type="number" min="1800" max="2100" value={form.annee_creation} onChange={e => set('annee_creation', e.target.value)} /></label>
              <label>Responsable / institution de tutelle <input type="text" value={form.responsable_institution} onChange={e => set('responsable_institution', e.target.value)} /></label>
              <label>Statut de fonctionnement
                <select value={form.statut_fonctionnement} onChange={e => set('statut_fonctionnement', e.target.value)}>
                  <option value="fonctionnel">En fonctionnement</option>
                  <option value="temporairement_ferme">Temporairement fermé</option>
                  <option value="non_fonctionnel">Non fonctionnel</option>
                </select>
              </label>
              {form.statut_fonctionnement !== 'fonctionnel' && (
                <label>Raison <input type="text" value={form.raison_non_fonctionnel} onChange={e => set('raison_non_fonctionnel', e.target.value)} /></label>
              )}
            </fieldset>
          )}

          {activeSection === 'localisation' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>C — Localisation géographique</legend>
              <label>Ville
                <select value={form.ville_id} onChange={e => set('ville_id', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {villes.map(v => <option key={v.id} value={v.id}>{v.nom}</option>)}
                </select>
              </label>
              {subdivisions.length > 0 && (
                <label>Arrondissement / subdivision
                  <select value={form.subdivision_id} onChange={e => set('subdivision_id', e.target.value)}>
                    <option value="">— Sélectionner —</option>
                    {subdivisions.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                  </select>
                </label>
              )}
              <label>Quartier <input type="text" value={form.quartier} onChange={e => set('quartier', e.target.value)} /></label>
              <label>Point de repère <input type="text" value={form.point_repere} onChange={e => set('point_repere', e.target.value)} /></label>
              <GpsCapture onCapture={handleGpsCapture} latitude={form.latitude} longitude={form.longitude} precision={form.precision_gps_m} />
            </fieldset>
          )}

          {activeSection === 'horaires' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>D — Horaires d'ouverture</legend>
              {JOURS.map(j => (
                <div key={j} style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'8px' }}>
                  <span style={{ width:'90px', fontSize:'14px', fontWeight:500 }}>{JOUR_LABELS[j]}</span>
                  <input type="time" value={form.horaires[j]?.ouverture || ''} onChange={e => setHoraire(j, 'ouverture', e.target.value)} style={{ width:'auto' }} />
                  <span style={{ color:'var(--text-muted)' }}>—</span>
                  <input type="time" value={form.horaires[j]?.fermeture || ''} onChange={e => setHoraire(j, 'fermeture', e.target.value)} style={{ width:'auto' }} />
                </div>
              ))}
              <label style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'12px' }}>
                <input type="checkbox" checked={form.horaires_variables} onChange={e => set('horaires_variables', e.target.checked)} style={{ width:'auto' }} />
                Horaires variables
              </label>
              <Select3 label="Ouvert pendant les vacances" value={form.ouvert_vacances} onChange={v => set('ouvert_vacances', v)} options={OUI_NON_PARFOIS} />
              <label>Périodes de fermeture <input type="text" value={form.periodes_fermeture} onChange={e => set('periodes_fermeture', e.target.value)} /></label>
            </fieldset>
          )}

          {activeSection === 'acces' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>E — Conditions d'accès</legend>
              <Select3 label="Accès gratuit" value={form.acces_gratuit} onChange={v => set('acces_gratuit', v)} options={OUI_NON_PARTIEL} />
              <label>Montant par visite (FCFA) <input type="number" min="0" value={form.montant_par_visite} onChange={e => set('montant_par_visite', e.target.value)} /></label>
              <label>Abonnement mensuel (FCFA) <input type="number" min="0" value={form.abonnement_mensuel} onChange={e => set('abonnement_mensuel', e.target.value)} /></label>
              <label>Conditions d'inscription (séparées par virgule) <input type="text" value={form.conditions_inscription} onChange={e => set('conditions_inscription', e.target.value)} placeholder="ex: Carte d'identité, Photo" /></label>
              <Select3 label="Consultation sans inscription" value={form.consultation_sans_inscription} onChange={v => set('consultation_sans_inscription', v)} options={OUI_NON_PARTIEL} />
              <label>Conditions élèves/étudiants <input type="text" value={form.conditions_eleves_etudiants} onChange={e => set('conditions_eleves_etudiants', e.target.value)} /></label>
              <label>Modes de paiement (séparés par virgule) <input type="text" value={form.modes_paiement} onChange={e => set('modes_paiement', e.target.value)} placeholder="ex: Espèces, Mobile Money" /></label>
            </fieldset>
          )}

          {activeSection === 'pret' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>F — Prêt et consultation</legend>
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.lecture_sur_place} onChange={e => set('lecture_sur_place', e.target.checked)} style={{ width:'auto' }} />
                Lecture sur place possible
              </label>
              <Select3 label="Emprunt à domicile" value={form.emprunt_domicile} onChange={v => set('emprunt_domicile', v)} options={OUI_NON_PARTIEL} />
              <label>Nombre max de livres empruntables <input type="number" min="0" value={form.nb_max_livres_empruntables} onChange={e => set('nb_max_livres_empruntables', e.target.value)} /></label>
              <label>Durée max du prêt <input type="text" value={form.duree_max_pret} onChange={e => set('duree_max_pret', e.target.value)} placeholder="ex: 15 jours" /></label>
              <label>Pénalités de retard <input type="text" value={form.penalites_retard} onChange={e => set('penalites_retard', e.target.value)} /></label>
              <label>Système de suivi des prêts <input type="text" value={form.systeme_suivi_prets} onChange={e => set('systeme_suivi_prets', e.target.value)} placeholder="ex: Registre, Logiciel" /></label>
            </fieldset>
          )}

          {activeSection === 'public' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>G — Public et fréquentation</legend>
              <label>Public cible (séparé par virgule) <input type="text" value={form.public_cible} onChange={e => set('public_cible', e.target.value)} placeholder="ex: Étudiants, Chercheurs, Grand public" /></label>
              <label>Fréquentation moyenne / jour <input type="number" min="0" value={form.frequentation_moyenne_jour} onChange={e => set('frequentation_moyenne_jour', e.target.value)} /></label>
              <label>Fréquentation moyenne / semaine <input type="number" min="0" value={form.frequentation_moyenne_semaine} onChange={e => set('frequentation_moyenne_semaine', e.target.value)} /></label>
              <Select3 label="Accessible aux personnes handicapées" value={form.accessible_handicap} onChange={v => set('accessible_handicap', v)} options={OUI_NON_PARTIEL} />
            </fieldset>
          )}

          {activeSection === 'collection' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>H/I — Collections et catalogue</legend>
              <label>Nombre de livres (estimation) <input type="number" min="0" value={form.nb_livres_estime} onChange={e => set('nb_livres_estime', e.target.value)} /></label>
              <label>Domaines couverts (séparés par virgule) <input type="text" value={form.domaines_couverts} onChange={e => set('domaines_couverts', e.target.value)} placeholder="ex: Sciences, Littérature, Droit" /></label>
              <label>Langues disponibles (séparées par virgule) <input type="text" value={form.langues_disponibles} onChange={e => set('langues_disponibles', e.target.value)} placeholder="ex: Français, Arabe, Anglais" /></label>
              <label>État des livres <input type="text" value={form.etat_des_livres} onChange={e => set('etat_des_livres', e.target.value)} placeholder="ex: Bon, Moyen, Mauvais" /></label>
              <Select3 label="Accepte les dons" value={form.accepte_dons} onChange={v => set('accepte_dons', v)} options={OUI_NON_PARTIEL} />
              <label>Logiciel de gestion <input type="text" value={form.logiciel_gestion} onChange={e => set('logiciel_gestion', e.target.value)} /></label>
            </fieldset>
          )}

          {activeSection === 'services' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>J — Services</legend>
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.salle_lecture} onChange={e => set('salle_lecture', e.target.checked)} style={{ width:'auto' }} />
                Salle de lecture
              </label>
              {form.salle_lecture && (
                <label>Nombre de places <input type="number" min="0" value={form.nb_places} onChange={e => set('nb_places', e.target.value)} /></label>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.wifi_gratuit} onChange={e => set('wifi_gratuit', e.target.checked)} style={{ width:'auto' }} />
                WiFi gratuit
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.ordinateurs_libre_acces} onChange={e => set('ordinateurs_libre_acces', e.target.checked)} style={{ width:'auto' }} />
                Ordinateurs en libre accès
              </label>
              {form.ordinateurs_libre_acces && (
                <label>Nombre d'ordinateurs <input type="number" min="0" value={form.nb_ordinateurs} onChange={e => set('nb_ordinateurs', e.target.value)} /></label>
              )}
              <label>Autres services <textarea rows={2} value={form.autres_services} onChange={e => set('autres_services', e.target.value)} /></label>
            </fieldset>
          )}

          {activeSection === 'activites' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>K — Activités</legend>
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.organise_activites} onChange={e => set('organise_activites', e.target.checked)} style={{ width:'auto' }} />
                Organise des activités culturelles
              </label>
              {form.organise_activites && (
                <>
                  <label>Types d'activités (séparés par virgule) <input type="text" value={form.types_activites} onChange={e => set('types_activites', e.target.value)} placeholder="ex: Club de lecture, Conférences" /></label>
                  <label>Fréquence <input type="text" value={form.frequence_activites} onChange={e => set('frequence_activites', e.target.value)} placeholder="ex: Hebdomadaire, Mensuel" /></label>
                  <Select3 label="Activités gratuites" value={form.gratuites_activites} onChange={v => set('gratuites_activites', v)} options={OUI_NON_PARTIEL} />
                </>
              )}
            </fieldset>
          )}

          {activeSection === 'infrastructure' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>M — Infrastructure</legend>
              <label>Problèmes matériels (séparés par virgule) <input type="text" value={form.problemes_materiels} onChange={e => set('problemes_materiels', e.target.value)} placeholder="ex: Toiture, Électricité, Mobilier" /></label>
              <Select3 label="Besoin de réhabilitation" value={form.besoin_rehabilitation} onChange={v => set('besoin_rehabilitation', v)} options={OUI_NON_PARTIEL} />
              <label>Types de travaux nécessaires <textarea rows={2} value={form.types_travaux} onChange={e => set('types_travaux', e.target.value)} /></label>
            </fieldset>
          )}

          {activeSection === 'communication' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>N — Communication</legend>
              <label>Site web <input type="url" value={form.site_web} onChange={e => set('site_web', e.target.value)} /></label>
              <label>WhatsApp public <input type="text" value={form.whatsapp_public} onChange={e => set('whatsapp_public', e.target.value)} /></label>
              <label>Email public <input type="email" value={form.email_public} onChange={e => set('email_public', e.target.value)} /></label>
              <label>Réseaux sociaux (séparés par virgule) <input type="text" value={form.reseaux_sociaux} onChange={e => set('reseaux_sociaux', e.target.value)} placeholder="ex: Facebook, Twitter" /></label>
              <Select3 label="Intéressé par une fiche numérique" value={form.interesse_fiche_numerique} onChange={v => set('interesse_fiche_numerique', v)} options={OUI_NON_PARTIEL} />
            </fieldset>
          )}

          {activeSection === 'besoins' && (
            <fieldset style={{ border:'none', padding:0, margin:0 }}>
              <legend style={{ fontSize:'16px', fontWeight:600, marginBottom:'12px' }}>O — Besoins et partenariats</legend>
              <label>Défis principaux <textarea rows={3} value={form.defis_principaux} onChange={e => set('defis_principaux', e.target.value)} /></label>
              <label>Types d'appui nécessaire (séparés par virgule) <input type="text" value={form.types_appui_necessaire} onChange={e => set('types_appui_necessaire', e.target.value)} placeholder="ex: Formation, Livres, Équipements" /></label>
              <label>Appui prioritaire <input type="text" value={form.appui_prioritaire} onChange={e => set('appui_prioritaire', e.target.value)} /></label>
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.a_deja_recu_appui} onChange={e => set('a_deja_recu_appui', e.target.checked)} style={{ width:'auto' }} />
                A déjà reçu un appui
              </label>
              {form.a_deja_recu_appui && (
                <label>Partenaire précédent <input type="text" value={form.partenaire_precedent} onChange={e => set('partenaire_precedent', e.target.value)} /></label>
              )}
              <label style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" checked={form.recherche_partenaires} onChange={e => set('recherche_partenaires', e.target.checked)} style={{ width:'auto' }} />
                Recherche des partenaires
              </label>
              {form.recherche_partenaires && (
                <label>Type de partenariat souhaité (séparés par virgule) <input type="text" value={form.type_partenariat_souhaite} onChange={e => set('type_partenariat_souhaite', e.target.value)} /></label>
              )}
            </fieldset>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'24px', flexWrap:'wrap', gap:'12px' }}>
            <div style={{ display:'flex', gap:'8px' }}>
              {secIdx > 0 && (
                <button type="button" className="btn btn-ghost" onClick={() => setActiveSection(SECTIONS[secIdx - 1].id)}>
                  &larr; Précédent
                </button>
              )}
              {secIdx < SECTIONS.length - 1 && (
                <button type="button" className="btn btn-primary" onClick={() => setActiveSection(SECTIONS[secIdx + 1].id)}>
                  Suivant &rarr;
                </button>
              )}
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button type="button" className="btn btn-ghost" onClick={handleSaveDraft}>Sauvegarder brouillon</button>
              {secIdx === SECTIONS.length - 1 && (
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Envoi…' : online ? 'Soumettre la fiche' : 'Sauvegarder hors-ligne'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}

      {tab === 'drafts' && (
        <div>
          {drafts.length > 0 && online && (
            <div style={{ marginBottom:'16px', textAlign:'right' }}>
              <button className="btn btn-primary btn-sm" onClick={syncAll}>Tout synchroniser</button>
            </div>
          )}
          {drafts.length === 0 ? (
            <div className="empty-state"><p>Aucun brouillon en attente.</p></div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {drafts.map(d => (
                <div key={d.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'start', gap:'12px', flexWrap:'wrap' }}>
                    <div>
                      <strong>{d.nom_officiel}</strong>
                      <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
                        Sauvegardé le {new Date(d.savedAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      {online && <button className="btn btn-primary btn-sm" onClick={() => syncDraft(d)}>Synchroniser</button>}
                      <button className="btn btn-danger btn-sm" onClick={() => { deleteDraft(d.id); loadDrafts(); }}>Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
