import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header style={{
      background: 'var(--primary)',
      color: '#fff',
      padding: '12px 0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: '18px' }}>
          Bibliothèques du Tchad
        </Link>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Carte</Link>
          <Link to="/recherche" style={{ color: '#fff', textDecoration: 'none' }}>Recherche</Link>
        </nav>
      </div>
    </header>
  );
}
