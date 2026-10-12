import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../services/api';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    if (!user) { setUnread(0); return; }
    try {
      const data = await apiGet('/notifications/non-lues');
      setUnread(data.count);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    fetchUnread();
    if (!user) return;
    const interval = setInterval(fetchUnread, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnread, user]);

  const isResponsable = user?.role === 'responsable_bibliotheque';
  const isEnqueteur = user?.role === 'enqueteur';

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="header-brand">
          Bibliofinder
        </Link>
        <nav className="header-nav">
          <Link to="/" className="header-link">Carte</Link>
          <Link to="/recherche" className="header-link">Recherche</Link>
          <Link to="/statistiques" className="header-link">Stats</Link>
          {(isResponsable || isEnqueteur) && (
            <>
              <Link to="/saisie-terrain" className="header-link">Saisie terrain</Link>
              <Link to="/mon-espace" className="header-link">Mon espace</Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className="header-link header-link-accent">Admin</Link>
          )}
          {user && unread > 0 && (
            <Link to={isAdmin ? '/admin?tab=notifications' : '/mon-espace?tab=notifications'} className="header-link" style={{ position: 'relative' }}>
              <span style={{
                background: '#e74c3c', color: '#fff', borderRadius: '50%',
                width: '20px', height: '20px', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700,
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="header-btn">Déconnexion</button>
          ) : (
            <Link to="/connexion" className="header-btn">Connexion</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
