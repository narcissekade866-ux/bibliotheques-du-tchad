import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost, apiPut } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '';

function PendingFiches({ fiches, onAction }) {
  const [loadingId, setLoadingId] = useState(null);
  const [motif, setMotif] = useState('');
  const [rejectId, setRejectId] = useState(null);
  const [feedback, setFeedback] = useState('');

  async function handleAction(id, action, motifText) {
    setLoadingId(id);
    setFeedback('');
    try {
      await apiPost(`/bibliotheques/${id}/validation`, {
        action,
        ...(motifText ? { motif: motifText } : {}),
      });
      setFeedback(action === 'valider' ? 'Fiche validée' : 'Fiche rejetée');
      onAction();
      setRejectId(null);
      setMotif('');
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  if (fiches.length === 0) {
    return <div className="empty-state"><p>Aucune fiche en attente de validation.</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {feedback && <div className="alert alert-success">{feedback}</div>}
      {fiches.map((f) => (
        <div key={f.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <strong style={{ fontSize: '15px' }}>{f.nom_officiel}</strong>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {[f.ville_nom, f.quartier].filter(Boolean).join(' — ')}
                {f.cree_par_nom && ` · par ${f.cree_par_nom}`}
                {f.statut_fonctionnement && f.statut_fonctionnement !== 'fonctionnel' && (
                  <span className={`badge ${
                    f.statut_fonctionnement === 'partiellement_fonctionnel' ? 'badge-warning'
                      : f.statut_fonctionnement === 'non_fonctionnel' ? 'badge-danger' : 'badge-neutral'
                  }`} style={{ marginLeft: '8px', fontSize: '11px' }}>
                    {f.statut_fonctionnement === 'partiellement_fonctionnel' ? 'Partiel.'
                      : f.statut_fonctionnement === 'non_fonctionnel' ? 'Non fonct.'
                      : 'Fermé temp.'}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Soumise le {new Date(f.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" disabled={loadingId === f.id}
                onClick={() => handleAction(f.id, 'valider')}>Valider</button>
              <button className="btn btn-danger btn-sm" disabled={loadingId === f.id}
                onClick={() => setRejectId(rejectId === f.id ? null : f.id)}>Rejeter</button>
            </div>
          </div>
          {rejectId === f.id && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <input value={motif} onChange={(e) => setMotif(e.target.value)}
                placeholder="Motif du rejet" style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" disabled={!motif.trim() || loadingId === f.id}
                onClick={() => handleAction(f.id, 'rejeter', motif)}>Confirmer</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PendingAvis({ avis, onAction }) {
  const [loadingId, setLoadingId] = useState(null);
  const [feedback, setFeedback] = useState('');

  async function handleModerate(id, statut) {
    setLoadingId(id);
    setFeedback('');
    try {
      await apiPut(`/avis/${id}/moderation`, { statut });
      setFeedback(statut === 'approuve' ? 'Avis approuvé' : 'Avis rejeté');
      onAction();
    } catch (err) {
      setFeedback(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  if (avis.length === 0) {
    return <div className="empty-state"><p>Aucun avis en attente de modération.</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {feedback && <div className="alert alert-success">{feedback}</div>}
      {avis.map((a) => (
        <div key={a.id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px' }}>{a.auteur_nom}</strong>
                <span className="stars" style={{ fontSize: '14px' }}>
                  {'★'.repeat(a.note)}
                </span>
                <span className="stars-empty" style={{ fontSize: '14px' }}>
                  {'★'.repeat(5 - a.note)}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                sur <em>{a.bibliotheque_nom}</em> · {new Date(a.created_at).toLocaleDateString('fr-FR')}
              </div>
              {a.commentaire && (
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {a.commentaire}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" disabled={loadingId === a.id}
                onClick={() => handleModerate(a.id, 'approuve')}>Approuver</button>
              <button className="btn btn-danger btn-sm" disabled={loadingId === a.id}
                onClick={() => handleModerate(a.id, 'rejete')}>Rejeter</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTable({ users, onUpdate }) {
  const [loadingId, setLoadingId] = useState(null);
  const [feedback, setFeedback] = useState('');
  const roles = ['visiteur', 'responsable_bibliotheque', 'enqueteur', 'administrateur'];
  const statuts = ['actif', 'suspendu', 'en_attente_verification'];

  async function changeRole(id, role) {
    setLoadingId(id);
    try {
      await apiPut(`/admin/utilisateurs/${id}/role`, { role });
      setFeedback('Rôle mis à jour');
      onUpdate();
    } catch (err) { setFeedback(err.message); }
    finally { setLoadingId(null); }
  }

  async function changeStatut(id, statut) {
    setLoadingId(id);
    try {
      await apiPut(`/admin/utilisateurs/${id}/statut`, { statut });
      setFeedback('Statut mis à jour');
      onUpdate();
    } catch (err) { setFeedback(err.message); }
    finally { setLoadingId(null); }
  }

  return (
    <>
      {feedback && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{feedback}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nom}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} disabled={loadingId === u.id}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '13px' }}>
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td>
                  <select value={u.statut} disabled={loadingId === u.id}
                    onChange={(e) => changeStatut(u.id, e.target.value)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '13px' }}>
                    {statuts.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ImageManager() {
  const [biblioId, setBiblioId] = useState('');
  const [images, setImages] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const loadImages = useCallback(async () => {
    if (!biblioId) return;
    try {
      const data = await apiGet(`/bibliotheques/${biblioId}`);
      setImages(data.images || []);
    } catch { setImages([]); }
  }, [biblioId]);

  useEffect(() => { loadImages(); }, [loadImages]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !biblioId) return;
    setUploading(true);
    setFeedback({ text: '', type: '' });
    try {
      const formData = new FormData();
      formData.append('image', file);
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/images/${biblioId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erreur upload');
      }
      setFeedback({ text: 'Image ajoutée', type: 'success' });
      setFile(null);
      loadImages();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(imageId) {
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Erreur suppression');
      }
      setFeedback({ text: 'Image supprimée', type: 'success' });
      loadImages();
    } catch (err) {
      setFeedback({ text: err.message, type: 'error' });
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'end' }}>
        <label style={{ width: 'auto' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID bibliothèque</span>
          <input type="text" placeholder="ex: abc-123..." value={biblioId}
            onChange={(e) => setBiblioId(e.target.value)} style={{ width: '200px' }} />
        </label>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFile(e.target.files[0])} style={{ width: 'auto', border: 'none', padding: '8px 0' }} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!file || !biblioId || uploading}>
            {uploading ? 'Envoi...' : 'Ajouter'}
          </button>
        </form>
      </div>

      {feedback.text && (
        <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}
          style={{ marginBottom: '16px' }}>{feedback.text}</div>
      )}

      {images.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '12px',
        }}>
          {images.map((img) => (
            <div key={img.id} style={{ position: 'relative' }}>
              <img src={`${API_BASE}${img.url}`} alt=""
                style={{
                  width: '100%', height: '120px', objectFit: 'cover',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                }} />
              <button onClick={() => handleDelete(img.id)}
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'var(--danger)', color: '#fff',
                  border: 'none', borderRadius: '50%',
                  width: '26px', height: '26px', fontSize: '16px',
                  cursor: 'pointer', lineHeight: '26px', padding: 0,
                  boxShadow: 'var(--shadow)',
                }}>
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SignalementsTab() {
  const [signalements, setSignalements] = useState([]);
  const [filtre, setFiltre] = useState('nouveau');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet(`/admin/signalements?statut=${filtre}`);
      setSignalements(data);
    } catch { setSignalements([]); }
    setLoading(false);
  }, [filtre]);

  useEffect(() => { load(); }, [load]);

  async function updateStatut(id, statut) {
    try {
      await apiPut(`/admin/signalements/${id}`, { statut });
      setFeedback('Signalement mis à jour');
      load();
    } catch (err) { setFeedback(err.message); }
  }

  const TYPE_LABELS = {
    horaires_incorrects: 'Horaires incorrects',
    adresse_incorrecte: 'Adresse incorrecte',
    fermeture: 'Fermeture',
    autre: 'Autre',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['nouveau', 'en_cours', 'traite', 'rejete'].map((s) => (
          <button key={s} className={`btn btn-sm ${filtre === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltre(s)}>
            {s === 'nouveau' ? 'Nouveaux' : s === 'en_cours' ? 'En cours' : s === 'traite' ? 'Traités' : 'Rejetés'}
          </button>
        ))}
      </div>
      {feedback && <div className="alert alert-success" style={{ marginBottom: '12px' }}>{feedback}</div>}
      {loading ? <p style={{ color: 'var(--text-muted)' }}>Chargement…</p> :
        signalements.length === 0 ? <div className="empty-state"><p>Aucun signalement.</p></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {signalements.map((s) => (
              <div key={s.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <strong style={{ fontSize: '14px' }}>{s.nom_officiel}</strong>
                    <span className="badge badge-accent" style={{ marginLeft: '8px' }}>{TYPE_LABELS[s.type] || s.type}</span>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '6px' }}>{s.description}</div>
                    {s.email_contact && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Contact : {s.email_contact}</div>}
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(s.created_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  {filtre === 'nouveau' && (
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => updateStatut(s.id, 'en_cours')}>Prendre en charge</button>
                      <button className="btn btn-danger btn-sm" onClick={() => updateStatut(s.id, 'rejete')}>Rejeter</button>
                    </div>
                  )}
                  {filtre === 'en_cours' && (
                    <button className="btn btn-primary btn-sm" onClick={() => updateStatut(s.id, 'traite')}>Marquer traité</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

function ObsoletesTab() {
  const [fiches, setFiches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiGet('/admin/fiches-obsoletes');
        setFiches(data);
      } catch { setFiches([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Chargement…</p>;
  if (fiches.length === 0) return <div className="empty-state"><p>Aucune fiche obsolète.</p></div>;

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Fiches validées non mises à jour depuis plus de 12 mois.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Nom</th><th>Dernière mise à jour</th><th>Action</th></tr>
          </thead>
          <tbody>
            {fiches.map((f) => (
              <tr key={f.id}>
                <td><a href={`/bibliotheque/${f.id}`} style={{ fontWeight: 500 }}>{f.nom_officiel}</a></td>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(f.updated_at).toLocaleDateString('fr-FR')}</td>
                <td><a href={`/bibliotheque/${f.id}`} className="btn btn-ghost btn-sm">Voir</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExportTab() {
  const [downloading, setDownloading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  async function downloadCSV() {
    setDownloading(true);
    try {
      const token = localStorage.getItem('access_token');
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiUrl}/admin/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bibliotheques-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDownloading(false);
  }

  async function generatePDF() {
    setGeneratingPdf(true);
    try {
      const data = await apiGet('/bibliotheques?limit=100');
      const fiches = data.bibliotheques || [];
      const printWin = window.open('', '_blank');
      if (!printWin) { setGeneratingPdf(false); return; }
      const rows = fiches.map((f) =>
        `<tr>
          <td>${esc(f.nom_officiel)}</td>
          <td>${esc(f.ville_nom || '')}</td>
          <td>${esc(f.quartier || '')}</td>
          <td>${esc(f.type || '')}</td>
          <td>${esc(f.statut_fonctionnement || '')}</td>
        </tr>`
      ).join('');
      printWin.document.write(`<!doctype html><html><head><meta charset="utf-8">
        <title>Bibliofinder — Export</title>
        <style>
          body{font-family:system-ui,sans-serif;margin:20px;color:#222}
          h1{font-size:18px;margin-bottom:4px}
          p{font-size:12px;color:#666;margin-top:0}
          table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
          th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
          th{background:#f5f5f5;font-weight:600}
          @media print{body{margin:10mm}}
        </style></head><body>
        <h1>Bibliofinder — Répertoire des bibliothèques</h1>
        <p>${fiches.length} fiche(s) · Exporté le ${new Date().toLocaleDateString('fr-FR')}</p>
        <table><thead><tr><th>Nom</th><th>Ville</th><th>Quartier</th><th>Type</th><th>Statut</th></tr></thead>
        <tbody>${rows}</tbody></table>
        </body></html>`);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => { printWin.print(); }, 300);
    } catch { /* ignore */ }
    setGeneratingPdf(false);
  }

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return (
    <div>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Exportez l'ensemble des fiches au format CSV (compatible Excel, LibreOffice) ou PDF.
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={downloadCSV} disabled={downloading}>
          {downloading ? 'Téléchargement…' : 'Télécharger le CSV'}
        </button>
        <button className="btn btn-ghost" onClick={generatePDF} disabled={generatingPdf}>
          {generatingPdf ? 'Génération…' : 'Générer un PDF'}
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('fiches');
  const [stats, setStats] = useState(null);
  const [fiches, setFiches] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingAvis, setPendingAvis] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const [s, f, u, av] = await Promise.all([
        apiGet('/admin/stats'),
        apiGet('/admin/fiches-en-attente'),
        apiGet('/admin/utilisateurs'),
        apiGet('/avis/en-attente'),
      ]);
      setStats(s);
      setFiches(f);
      setUsers(u);
      setPendingAvis(av);
    } catch { /* handled per-component */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (!isAdmin) {
    return (
      <main className="container empty-state" style={{ flex: 1, padding: '48px 16px' }}>
        <h1>Accès refusé</h1>
        <p>Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  const tabs = [
    { id: 'fiches', label: `Fiches (${fiches.length})` },
    { id: 'avis', label: `Avis (${pendingAvis.length})` },
    { id: 'signalements', label: 'Signalements' },
    { id: 'obsoletes', label: 'Obsolètes' },
    { id: 'utilisateurs', label: 'Utilisateurs' },
    { id: 'images', label: 'Images' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <h1 style={{ margin: '0 0 24px' }}>Tableau de bord</h1>

      {stats && (
        <div className="grid grid-stats" style={{ marginBottom: '28px' }}>
          <div className="stat-card">
            <div className="stat-value">{stats.fiches_en_attente}</div>
            <div className="stat-label">En attente</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.bibliotheques?.valide || 0}</div>
            <div className="stat-label">Validées</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">
              {Object.values(stats.utilisateurs || {}).reduce((a, b) => a + b, 0)}
            </div>
            <div className="stat-label">Utilisateurs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.avis_total}</div>
            <div className="stat-label">Avis</div>
          </div>
        </div>
      )}

      <div className="tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fiches' && <PendingFiches fiches={fiches} onAction={loadData} />}
      {tab === 'avis' && <PendingAvis avis={pendingAvis} onAction={loadData} />}
      {tab === 'signalements' && <SignalementsTab />}
      {tab === 'obsoletes' && <ObsoletesTab />}
      {tab === 'utilisateurs' && <UsersTable users={users} onUpdate={loadData} />}
      {tab === 'images' && <ImageManager />}
      {tab === 'export' && <ExportTab />}
    </main>
  );
}
