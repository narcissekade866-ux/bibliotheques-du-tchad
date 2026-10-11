import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { user, isAdmin, logout } = useAuth();

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
          {isAdmin && (
            <Link to="/admin" className="header-link header-link-accent">Admin</Link>
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
