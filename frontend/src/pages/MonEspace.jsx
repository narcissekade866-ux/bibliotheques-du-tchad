import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPut } from '../services/api';

const STATUT_LABELS = {
  en_attente: { text: 'En attente', cls: 'badge-warning' },
  valide: { text: 'Validée', cls: 'badge-success' },
  rejete: { text: 'Rejetée', cls: 'badge-danger' },
  brouillon: { text: 'Brouillon', cls: 'badge-neutral' },
};

const ROLE_LABELS = {
  responsable_bibliotheque: 'Responsable de bibliothèque',
  enqueteur: 'Enquêteur terrain',
  administrateur: 'Administrateur',
  visiteur: 'Visiteur',
};

export default function MonEspace() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'fiches';

  const [tab, setTab] = useState(initialTab);
  const [fiches, setFiches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [fichesRes, notifRes] = await Promise.all([
        apiGet('/bibliotheques?limit=50'),
        apiGet('/notifications'),
      ]);
      setFiches(fichesRes.bibliotheques || []);
      setNotifications(notifRes);
    } catch { /* ignore */ }
    setLoadingData(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/connexion');
  }, [authLoading, user, navigate]);

  if (authLoading || !user) return null;

  async function markRead(id) {
    try {
      await apiPut(`/notifications/${id}/lue`);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, lue: true } : n));
    } catch { /* ignore */ }
  }

  async function markAllRead() {
    try {
      await apiPut('/notifications/tout-lire');
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch { /* ignore */ }
  }

  const unread = notifications.filter((n) => !n.lue).length;

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <h1 style={{ margin: '0 0 4px' }}>Mon espace</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 0, marginBottom: '24px' }}>
        {user.nom} &middot; {ROLE_LABELS[user.role] || user.role}
      </p>

      <div className="tabs">
        <button className={`tab ${tab === 'fiches' ? 'tab-active' : ''}`} onClick={() => setTab('fiches')}>
          Mes fiches
        </button>
        <button className={`tab ${tab === 'notifications' ? 'tab-active' : ''}`} onClick={() => setTab('notifications')}>
          Notifications {unread > 0 && <span className="badge badge-danger" style={{ marginLeft: '6px', fontSize: '11px' }}>{unread}</span>}
        </button>
      </div>

      {tab === 'fiches' && (
        <FichesTab fiches={fiches} loading={loadingData} />
      )}

      {tab === 'notifications' && (
        <NotificationsTab
          notifications={notifications}
          loading={loadingData}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      )}
    </main>
  );
}

function FichesTab({ fiches, loading }) {
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>;

  if (fiches.length === 0) {
    return (
      <div className="empty-state">
        <p>Aucune fiche trouvée.</p>
        <p style={{ fontSize: '13px' }}>Les fiches que vous créez ou modifiez apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Ville</th>
            <th>Statut</th>
            <th>Mise à jour</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {fiches.map((f) => {
            const s = STATUT_LABELS[f.statut_validation] || { text: f.statut_validation, cls: 'badge-neutral' };
            return (
              <tr key={f.id}>
                <td>
                  <Link to={`/bibliotheque/${f.id}`} style={{ fontWeight: 500 }}>
                    {f.nom_officiel}
                  </Link>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{f.ville_nom || '—'}</td>
                <td>
                  <span className={`badge ${s.cls}`}>{s.text}</span>
                </td>
                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {new Date(f.updated_at).toLocaleDateString('fr-FR')}
                </td>
                <td>
                  <Link to={`/bibliotheque/${f.id}/modifier`} className="btn btn-ghost btn-sm">
                    Modifier
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NotificationsTab({ notifications, loading, onMarkRead, onMarkAllRead }) {
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Chargement...</p>;

  const unread = notifications.filter((n) => !n.lue).length;

  return (
    <div>
      {unread > 0 && (
        <div style={{ marginBottom: '16px', textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={onMarkAllRead}>
            Tout marquer comme lu
          </button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="empty-state">
          <p>Aucune notification.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                opacity: n.lue ? 0.7 : 1,
                borderLeft: n.lue ? undefined : '3px solid var(--accent)',
                cursor: n.lue ? 'default' : 'pointer',
              }}
              onClick={() => !n.lue && onMarkRead(n.id)}
              role={n.lue ? undefined : 'button'}
              tabIndex={n.lue ? undefined : 0}
              onKeyDown={(e) => !n.lue && e.key === 'Enter' && onMarkRead(n.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{n.titre}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.message}</div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {new Date(n.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {n.bibliotheque_id && (
                <Link to={`/bibliotheque/${n.bibliotheque_id}`} style={{ fontSize: '13px', marginTop: '8px', display: 'inline-block' }}>
                  Voir la fiche
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
