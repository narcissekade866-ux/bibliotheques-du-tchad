import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost } from '../services/api';
import { saveDraft, getAllDrafts, deleteDraft, markSynced } from '../services/offlineDb';

const TYPES = [
  { value: 'publique', label: 'Publique' },
  { value: 'universitaire', label: 'Universitaire' },
  { value: 'scolaire', label: 'Scolaire' },
  { value: 'specialisee', label: 'Spécialisée' },
  { value: 'communautaire', label: 'Communautaire' },
  { value: 'privee', label: 'Privée' },
  { value: 'associative', label: 'Associative' },
  { value: 'autre', label: 'Autre' },
];

const STATUTS = [
  { value: 'fonctionnel', label: 'En fonctionnement' },
  { value: 'temporairement_ferme', label: 'Temporairement fermé' },
  { value: 'non_fonctionnel', label: 'Non fonctionnel' },
];

const INITIAL = {
  nom_officiel: '',
  nom_alternatif: '',
  type: '',
  annee_creation: '',
  responsable_institution: '',
  statut_fonctionnement: 'fonctionnel',
  raison_non_fonctionnel: '',
  enquete_repondant_nom: '',
  enquete_repondant_fonction: '',
  enquete_repondant_contact: '',
  ville_id: '',
  quartier: '',
  point_repere: '',
  latitude: '',
  longitude: '',
};

export default function SaisieTerrain() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [villes, setVilles] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [geoLoading, setGeoLoading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
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

  async function loadDrafts() {
    try {
      const all = await getAllDrafts();
      setDrafts(all.filter((d) => !d.synced));
    } catch { setDrafts([]); }
  }

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function captureGPS() {
    if (!navigator.geolocation) {
      setFeedback({ text: 'Géolocalisation non supportée par ce navigateur', type: 'error' });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
        setFeedback({ text: 'Position GPS capturée', type: 'success' });
      },
      (err) => {
        setGeoLoading(false);
        const msgs = { 1: 'Permission refusée', 2: 'Position indisponible', 3: 'Délai dépassé' };
        setFeedback({ text: msgs[err.code] || 'Erreur GPS', type: 'error' });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function buildPayload(data) {
    const payload = {
      nom_officiel: data.nom_officiel,
    };
    if (data.nom_alternatif) payload.nom_alternatif = data.nom_alternatif;
    if (data.type) payload.type = data.type;
    if (data.annee_creation) payload.annee_creation = parseInt(data.annee_creation, 10);
    if (data.responsable_institution) payload.responsable_institution = data.responsable_institution;
    if (data.statut_fonctionnement) payload.statut_fonctionnement = data.statut_fonctionnement;
    if (data.raison_non_fonctionnel) payload.raison_non_fonctionnel = data.raison_non_fonctionnel;
    if (data.enquete_repondant_nom) payload.enquete_repondant_nom = data.enquete_repondant_nom;
    if (data.enquete_repondant_fonction) payload.enquete_repondant_fonction = data.enquete_repondant_fonction;
    if (data.enquete_repondant_contact) payload.enquete_repondant_contact = data.enquete_repondant_contact;

    if (data.ville_id) {
      payload.localisation = { ville_id: data.ville_id };
      if (data.quartier) payload.localisation.quartier = data.quartier;
      if (data.point_repere) payload.localisation.point_repere = data.point_repere;
      if (data.latitude) payload.localisation.latitude = parseFloat(data.latitude);
      if (data.longitude) payload.localisation.longitude = parseFloat(data.longitude);
    }
    return payload;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom_officiel.trim()) {
      setFeedback({ text: 'Le nom officiel est obligatoire', type: 'error' });
      return;
    }

    if (online) {
      setSubmitting(true);
      try {
        await apiPost('/bibliotheques', buildPayload(form));
        setFeedback({ text: 'Fiche envoyée avec succès (en attente de validation)', type: 'success' });
        setForm(INITIAL);
      } catch (err) {
        setFeedback({ text: err.message || 'Erreur envoi', type: 'error' });
      }
      setSubmitting(false);
    } else {
      try {
        await saveDraft(form);
        setFeedback({ text: 'Brouillon sauvegardé hors-ligne. Il sera envoyé quand la connexion sera rétablie.', type: 'success' });
        setForm(INITIAL);
        loadDrafts();
      } catch {
        setFeedback({ text: 'Erreur lors de la sauvegarde locale', type: 'error' });
      }
    }
  }

  async function handleSaveDraft() {
    if (!form.nom_officiel.trim()) {
      setFeedback({ text: 'Le nom officiel est obligatoire pour sauvegarder', type: 'error' });
      return;
    }
    try {
      await saveDraft(form);
      setFeedback({ text: 'Brouillon sauvegardé', type: 'success' });
      setForm(INITIAL);
      loadDrafts();
    } catch {
      setFeedback({ text: 'Erreur lors de la sauvegarde', type: 'error' });
    }
  }

  async function syncDraft(draft) {
    if (!online) {
      setFeedback({ text: 'Pas de connexion — impossible de synchroniser', type: 'error' });
      return;
    }
    try {
      await apiPost('/bibliotheques', buildPayload(draft));
      await markSynced(draft.id);
      setFeedback({ text: `"${draft.nom_officiel}" synchronisée`, type: 'success' });
      loadDrafts();
    } catch (err) {
      setFeedback({ text: `Erreur : ${err.message}`, type: 'error' });
    }
  }

  async function syncAll() {
    if (!online) {
      setFeedback({ text: 'Pas de connexion', type: 'error' });
      return;
    }
    let ok = 0;
    let fail = 0;
    for (const d of drafts) {
      try {
        await apiPost('/bibliotheques', buildPayload(d));
        await markSynced(d.id);
        ok++;
      } catch { fail++; }
    }
    setFeedback({ text: `${ok} fiche(s) synchronisée(s)${fail ? `, ${fail} erreur(s)` : ''}`, type: fail ? 'error' : 'success' });
    loadDrafts();
  }

  async function removeDraft(id) {
    await deleteDraft(id);
    loadDrafts();
  }

  if (authLoading || !user) return null;

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1, maxWidth: '640px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
        Saisie terrain
      </h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: online ? '#27ae60' : '#e74c3c', display: 'inline-block',
        }} />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {online ? 'En ligne' : 'Hors-ligne — les fiches seront sauvegardées localement'}
        </span>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'form' ? 'tab-active' : ''}`} onClick={() => setTab('form')}>
          Nouvelle fiche
        </button>
        <button className={`tab ${tab === 'drafts' ? 'tab-active' : ''}`} onClick={() => setTab('drafts')}>
          Brouillons {drafts.length > 0 && <span className="badge badge-accent" style={{ marginLeft: '6px' }}>{drafts.length}</span>}
        </button>
      </div>

      {feedback.text && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '16px' }}>
          {feedback.text}
        </div>
      )}

      {tab === 'form' && (
        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Identification</legend>
            <label>
              Nom officiel *
              <input type="text" value={form.nom_officiel} onChange={(e) => set('nom_officiel', e.target.value)} required />
            </label>
            <label>
              Nom alternatif
              <input type="text" value={form.nom_alternatif} onChange={(e) => set('nom_alternatif', e.target.value)} />
            </label>
            <label>
              Type
              <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label>
              Année de création
              <input type="number" min="1800" max="2100" value={form.annee_creation} onChange={(e) => set('annee_creation', e.target.value)} />
            </label>
            <label>
              Responsable / institution de tutelle
              <input type="text" value={form.responsable_institution} onChange={(e) => set('responsable_institution', e.target.value)} />
            </label>
            <label>
              Statut de fonctionnement
              <select value={form.statut_fonctionnement} onChange={(e) => set('statut_fonctionnement', e.target.value)}>
                {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
            {form.statut_fonctionnement !== 'fonctionnel' && (
              <label>
                Raison
                <input type="text" value={form.raison_non_fonctionnel} onChange={(e) => set('raison_non_fonctionnel', e.target.value)} />
              </label>
            )}
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: '24px 0 0' }}>
            <legend style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Localisation</legend>
            <label>
              Ville
              <select value={form.ville_id} onChange={(e) => set('ville_id', e.target.value)}>
                <option value="">— Sélectionner —</option>
                {villes.map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
              </select>
            </label>
            <label>
              Quartier
              <input type="text" value={form.quartier} onChange={(e) => set('quartier', e.target.value)} />
            </label>
            <label>
              Point de repère
              <input type="text" value={form.point_repere} onChange={(e) => set('point_repere', e.target.value)} />
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'end' }}>
              <label style={{ flex: 1, minWidth: '120px' }}>
                Latitude
                <input type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
              </label>
              <label style={{ flex: 1, minWidth: '120px' }}>
                Longitude
                <input type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
              </label>
              <button type="button" className="btn btn-ghost btn-sm" onClick={captureGPS} disabled={geoLoading}
                style={{ marginBottom: '12px' }}>
                {geoLoading ? 'Capture…' : 'Capturer GPS'}
              </button>
            </div>
          </fieldset>

          <fieldset style={{ border: 'none', padding: 0, margin: '24px 0 0' }}>
            <legend style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Répondant</legend>
            <label>
              Nom
              <input type="text" value={form.enquete_repondant_nom} onChange={(e) => set('enquete_repondant_nom', e.target.value)} />
            </label>
            <label>
              Fonction
              <input type="text" value={form.enquete_repondant_fonction} onChange={(e) => set('enquete_repondant_fonction', e.target.value)} />
            </label>
            <label>
              Contact
              <input type="text" value={form.enquete_repondant_contact} onChange={(e) => set('enquete_repondant_contact', e.target.value)} />
            </label>
          </fieldset>

          <div style={{ display: 'flex', gap: '12px', marginTop: '28px', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Envoi…' : online ? 'Envoyer' : 'Sauvegarder hors-ligne'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleSaveDraft}>
              Sauvegarder comme brouillon
            </button>
          </div>
        </form>
      )}

      {tab === 'drafts' && (
        <div>
          {drafts.length > 0 && online && (
            <div style={{ marginBottom: '16px', textAlign: 'right' }}>
              <button className="btn btn-primary btn-sm" onClick={syncAll}>
                Tout synchroniser
              </button>
            </div>
          )}
          {drafts.length === 0 ? (
            <div className="empty-state"><p>Aucun brouillon en attente.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {drafts.map((d) => (
                <div key={d.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{d.nom_officiel}</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Sauvegardé le {new Date(d.savedAt).toLocaleString('fr-FR')}
                      </div>
                      {d.quartier && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{d.quartier}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      {online && (
                        <button className="btn btn-primary btn-sm" onClick={() => syncDraft(d)}>
                          Synchroniser
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => removeDraft(d.id)}>
                        Supprimer
                      </button>
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
