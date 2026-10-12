import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../services/api';

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 22, height: 22 }}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function Header() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const isResponsable = user?.role === 'responsable_bibliotheque';
  const isEnqueteur = user?.role === 'enqueteur';

  function isActive(path) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  const navLinks = [
    { to: '/', label: 'Carte', show: true },
    { to: '/recherche', label: 'Recherche', show: true },
    { to: '/statistiques', label: 'Statistiques', show: true },
    { to: '/saisie-terrain', label: 'Saisie terrain', show: isResponsable || isEnqueteur || isAdmin },
    { to: '/mon-espace', label: 'Mon espace', show: isResponsable || isEnqueteur },
    { to: '/admin', label: 'Administration', show: isAdmin, accent: true },
  ];

  const notifLink = user && unread > 0
    ? isAdmin ? '/admin?tab=notifications' : '/mon-espace?tab=notifications'
    : null;

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="header-brand">
            <BookIcon />
            Bibliofinder
          </Link>

          <nav className="header-nav" aria-label="Navigation principale">
            {navLinks.filter(l => l.show).map(l => (
              <Link key={l.to} to={l.to}
                className={`header-link${l.accent ? ' header-link-accent' : ''}${isActive(l.to) ? ' header-link-active' : ''}`}>
                {l.label}
              </Link>
            ))}
            {notifLink && (
              <Link to={notifLink} className="header-link" aria-label={`${unread} notifications non lues`}>
                <span className="header-badge">{unread > 9 ? '9+' : unread}</span>
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="header-btn">Déconnexion</button>
            ) : (
              <Link to="/connexion" className="header-btn">Connexion</Link>
            )}
          </nav>

          <button className="header-hamburger" onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu" aria-expanded={mobileOpen}>
            <MenuIcon />
          </button>
        </div>
      </header>

      <div className="mobile-nav-overlay" data-open={mobileOpen ? 'true' : undefined}
        onClick={() => setMobileOpen(false)} aria-hidden={!mobileOpen} />

      {mobileOpen && (
        <nav className="mobile-nav" role="navigation" aria-label="Menu mobile">
          <button className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
            <CloseIcon />
          </button>

          {navLinks.filter(l => l.show).map(l => (
            <Link key={l.to} to={l.to}
              className={`mobile-nav-link${isActive(l.to) ? ' mobile-nav-link-active' : ''}`}>
              {l.label}
            </Link>
          ))}

          {notifLink && (
            <>
              <div className="mobile-nav-divider" />
              <Link to={notifLink} className="mobile-nav-link">
                Notifications
                <span className="header-badge" style={{ marginLeft: 'auto' }}>{unread > 9 ? '9+' : unread}</span>
              </Link>
            </>
          )}

          <div className="mobile-nav-divider" />

          {user ? (
            <button onClick={() => { logout(); setMobileOpen(false); }}
              className="mobile-nav-link" style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
              Déconnexion
            </button>
          ) : (
            <Link to="/connexion" className="mobile-nav-link">
              Connexion
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
