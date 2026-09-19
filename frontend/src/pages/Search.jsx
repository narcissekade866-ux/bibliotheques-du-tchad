import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import SearchBar from '../components/SearchBar';
import MapView from '../components/MapView';
import BiblioCard from '../components/BiblioCard';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bibliotheques, setBibliotheques] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('list');
  const [userPos, setUserPos] = useState(null);
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (type) params.set('type', type);
        params.set('page', page);
        params.set('limit', '20');
        if (userPos) {
          params.set('lat', userPos.lat);
          params.set('lng', userPos.lng);
          params.set('rayon', '50000');
        }
        const data = await apiGet(`/bibliotheques?${params}`);
        setBibliotheques(data.bibliotheques || []);
        setPagination(data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    search();
  }, [q, type, page, userPos]);

  function handleSearch(newQ) {
    setSearchParams({ q: newQ, ...(type && { type }) });
  }

  function handleTypeChange(e) {
    const params = {};
    if (q) params.q = q;
    if (e.target.value) params.type = e.target.value;
    setSearchParams(params);
  }

  return (
    <main className="container" style={{ padding: '24px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
        <SearchBar onSearch={handleSearch} initialQuery={q} />
        <select value={type} onChange={handleTypeChange} style={{ minWidth: '150px' }}>
          <option value="">Tous les types</option>
          <option value="publique">Publique</option>
          <option value="universitaire">Universitaire</option>
          <option value="scolaire">Scolaire</option>
          <option value="specialisee">Spécialisée</option>
          <option value="communautaire">Communautaire</option>
          <option value="privee">Privée</option>
          <option value="associative">Associative</option>
        </select>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setView('list')}
            className={`btn ${view === 'list' ? 'btn-primary' : ''}`}
            style={view !== 'list' ? { background: 'var(--bg-alt)', border: '1px solid var(--border)' } : {}}
          >
            Liste
          </button>
          <button
            onClick={() => setView('map')}
            className={`btn ${view === 'map' ? 'btn-primary' : ''}`}
            style={view !== 'map' ? { background: 'var(--bg-alt)', border: '1px solid var(--border)' } : {}}
          >
            Carte
          </button>
        </div>
      </div>

      {loading && <p>Chargement...</p>}

      {!loading && bibliotheques.length === 0 && (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
          Aucune bibliothèque trouvée.{q && ' Essayez avec d\'autres termes de recherche.'}
        </p>
      )}

      {!loading && view === 'list' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px',
        }}>
          {bibliotheques.map((b) => (
            <BiblioCard key={b.id} biblio={b} />
          ))}
        </div>
      )}

      {!loading && view === 'map' && (
        <div style={{ height: '60vh', minHeight: '400px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <MapView
            bibliotheques={bibliotheques}
            onMarkerClick={(b) => navigate(`/bibliotheque/${b.id}`)}
          />
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
          {page > 1 && (
            <button
              className="btn"
              style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)' }}
              onClick={() => setSearchParams({ q, ...(type && { type }), page: page - 1 })}
            >
              Précédent
            </button>
          )}
          <span style={{ padding: '8px', fontSize: '14px' }}>
            Page {page} / {pagination.pages}
          </span>
          {page < pagination.pages && (
            <button
              className="btn"
              style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)' }}
              onClick={() => setSearchParams({ q, ...(type && { type }), page: page + 1 })}
            >
              Suivant
            </button>
          )}
        </div>
      )}
    </main>
  );
}
