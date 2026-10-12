import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut } from '../services/api';

const TYPES = [
  { value: '', label: '— Sélectionner —' },
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

export default function EditFiche() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [biblio, setBiblio] = useState(null);
  const [villes, setVilles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const [form, setForm] = useState({
    nom_officiel: '',
    nom_alternatif: '',
    type: '',
    annee_creation: '',
    responsable_institution: '',
    statut_fonctionnement: 'fonctionnel',
    raison_non_fonctionnel: '',
    ville_id: '',
    quartier: '',
    point_repere: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/connexion');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    async function load() {
      try {
        const [data, villesData] = await Promise.all([
          apiGet(`/bibliotheques/${id}`),
          apiGet('/villes'),
        ]);
        setBiblio(data);
        setVilles(villesData);
        setForm({
          nom_officiel: data.nom_officiel || '',
          nom_alternatif: data.nom_alternatif || '',
          type: data.type || '',
          annee_creation: data.annee_creation || '',
          responsable_institution: data.responsable_institution || '',
          statut_fonctionnement: data.statut_fonctionnement || 'fonctionnel',
          raison_non_fonctionnel: data.raison_non_fonctionnel || '',
          ville_id: data.localisation?.ville_id || '',
          quartier: data.localisation?.quartier || '',
          point_repere: data.localisation?.point_repere || '',
          latitude: data.localisation?.latitude || '',
          longitude: data.localisation?.longitude || '',
        });
      } catch (err) {
        setFeedback({ text: err.message, type: 'error' });
      }
      setLoading(false);
    }
    if (user) load();
  }, [id, user]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom_officiel.trim()) {
      setFeedback({ text: 'Le nom officiel est obligatoire', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback({ text: '', type: '' });

    const payload = {
      nom_officiel: form.nom_officiel,
      nom_alternatif: form.nom_alternatif || undefined,
      type: form.type || undefined,
      annee_creation: form.annee_creation ? parseInt(form.annee_creation, 10) : undefined,
      responsable_institution: form.responsable_institution || undefined,
      statut_fonctionnement: form.statut_fonctionnement || undefined,
      raison_non_fonctionnel: form.raison_non_fonctionnel || undefined,
    };

    if (form.ville_id) {
      payload.localisation = {
        ville_id: form.ville_id,
        quartier: form.quartier || undefined,
        point_repere: form.point_repere || undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      };
    }

    try {
      await apiPut(`/bibliotheques/${id}`, payload);
      setFeedback({
        text: 'Modification enregistrée. La fiche est en attente de validation.',
        type: 'success',
      });
    } catch (err) {
      setFeedback({ text: err.message || 'Erreur', type: 'error' });
    }
    setSubmitting(false);
  }

  if (authLoading || !user) return null;
  if (loading) {
    return (
      <main className="container" style={{ padding: '28px 16px', flex: 1, maxWidth: '640px' }}>
        <div className="skeleton skeleton-title" style={{ width: '60%' }} />
        <div className="skeleton" style={{ height: '300px' }} />
      </main>
    );
  }

  if (!biblio) {
    return (
      <main className="container empty-state" style={{ flex: 1 }}>
        <p>Bibliothèque introuvable.</p>
      </main>
    );
  }

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1, maxWidth: '640px' }}>
      <Link to={`/bibliotheque/${id}`} style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
        &larr; Retour à la fiche
      </Link>

      <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '12px 0 4px' }}>
        Modifier la fiche
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 0, marginBottom: '20px' }}>
        {biblio.nom_officiel}
      </p>

      {feedback.text && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}
          style={{ marginBottom: '16px' }}>
          {feedback.text}
        </div>
      )}

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
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: '120px' }}>
              Latitude
              <input type="number" step="any" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} />
            </label>
            <label style={{ flex: 1, minWidth: '120px' }}>
              Longitude
              <input type="number" step="any" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} />
            </label>
          </div>
        </fieldset>

        <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Après enregistrement, la fiche sera soumise à validation par un administrateur.
        </p>
      </form>
    </main>
  );
}
