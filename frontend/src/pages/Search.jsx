import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <div className="search-controls">
        <SearchBar onSearch={handleSearch} initialQuery={q} />
        <select value={type} onChange={handleTypeChange} style={{ minWidth: '150px', width: 'auto' }}>
          <option value="">Tous les types</option>
          <option value="publique">Publique</option>
          <option value="universitaire">Universitaire</option>
          <option value="scolaire">Scolaire</option>
          <option value="specialisee">Spécialisée</option>
          <option value="communautaire">Communautaire</option>
          <option value="privee">Privée</option>
          <option value="associative">Associative</option>
        </select>
        <div className="toggle-group">
          <button className={`toggle-btn ${view === 'list' ? 'toggle-active' : ''}`}
            onClick={() => setView('list')}>Liste</button>
          <button className={`toggle-btn ${view === 'map' ? 'toggle-active' : ''}`}
            onClick={() => setView('map')}>Carte</button>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cards">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {!loading && bibliotheques.length === 0 && (
        <div className="empty-state">
          <p>Aucune bibliothèque trouvée.</p>
          {q && <p>Essayez avec d'autres termes de recherche.</p>}
        </div>
      )}

      {!loading && view === 'list' && bibliotheques.length > 0 && (
        <div className="grid grid-cards">
          {bibliotheques.map((b) => (
            <BiblioCard key={b.id} biblio={b} />
          ))}
        </div>
      )}

      {!loading && view === 'map' && bibliotheques.length > 0 && (
        <div className="map-container" style={{ height: '60vh', minHeight: '400px' }}>
          <MapView
            bibliotheques={bibliotheques}
            onMarkerClick={(b) => navigate(`/bibliotheque/${b.id}`)}
          />
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="pagination">
          {page > 1 && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSearchParams({ q, ...(type && { type }), page: page - 1 })}>
              Précédent
            </button>
          )}
          <span className="pagination-info">
            Page {page} / {pagination.pages}
          </span>
          {page < pagination.pages && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSearchParams({ q, ...(type && { type }), page: page + 1 })}>
              Suivant
            </button>
          )}
        </div>
      )}
    </main>
  );
}
