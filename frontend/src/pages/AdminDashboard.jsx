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
                  <span style={{
                    marginLeft: '8px', fontSize: '11px', padding: '1px 6px', borderRadius: '8px',
                    color: '#fff',
                    background: f.statut_fonctionnement === 'partiellement_fonctionnel' ? '#e67e22'
                      : f.statut_fonctionnement === 'non_fonctionnel' ? '#c0392b' : '#7f8c8d',
                  }}>
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
      const apiUrl = import.meta.env.VITE_API_URL;
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
      const apiUrl = import.meta.env.VITE_API_URL;
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
      <main className="container empty-state" style={{ flex: 1 }}>
        <h1 style={{ fontSize: '24px' }}>Accès refusé</h1>
        <p>Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  const tabs = [
    { id: 'fiches', label: `Fiches en attente (${fiches.length})` },
    { id: 'avis', label: `Avis (${pendingAvis.length})` },
    { id: 'utilisateurs', label: 'Utilisateurs' },
    { id: 'images', label: 'Images' },
  ];

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 24px' }}>Tableau de bord</h1>

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

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`tab ${tab === t.id ? 'tab-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fiches' && <PendingFiches fiches={fiches} onAction={loadData} />}
      {tab === 'avis' && <PendingAvis avis={pendingAvis} onAction={loadData} />}
      {tab === 'utilisateurs' && <UsersTable users={users} onUpdate={loadData} />}
      {tab === 'images' && <ImageManager />}
    </main>
  );
}
