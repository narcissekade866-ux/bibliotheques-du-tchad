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
  const statut = searchParams.get('statut') || '';
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
        if (statut) params.set('statut_fonctionnement', statut);
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
  }, [q, type, statut, page, userPos]);

  function buildParams(overrides) {
    const params = {};
    if (q) params.q = q;
    if (type) params.type = type;
    if (statut) params.statut = statut;
    return { ...params, ...overrides };
  }

  function handleSearch(newQ) {
    setSearchParams(buildParams({ q: newQ || undefined }));
  }

  function handleTypeChange(e) {
    setSearchParams(buildParams({ type: e.target.value || undefined }));
  }

  function handleStatutChange(e) {
    setSearchParams(buildParams({ statut: e.target.value || undefined }));
  }

  return (
    <main className="container" style={{ padding: '28px 16px', flex: 1 }}>
      <h1 style={{ margin: '0 0 20px' }}>Recherche</h1>

      <div className="search-controls">
        <SearchBar onSearch={handleSearch} initialQuery={q} />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={type} onChange={handleTypeChange} style={{ flex: '1 1 140px', minWidth: '140px', width: 'auto' }}>
            <option value="">Tous les types</option>
            <option value="publique">Publique</option>
            <option value="universitaire">Universitaire</option>
            <option value="scolaire">Scolaire</option>
            <option value="specialisee">Spécialisée</option>
            <option value="communautaire">Communautaire</option>
            <option value="privee">Privée</option>
            <option value="associative">Associative</option>
          </select>
          <select value={statut} onChange={handleStatutChange} style={{ flex: '1 1 140px', minWidth: '140px', width: 'auto' }}>
            <option value="">Tous les statuts</option>
            <option value="fonctionnel">En fonctionnement</option>
            <option value="partiellement_fonctionnel">Partiellement fonctionnel</option>
            <option value="non_fonctionnel">Non fonctionnel</option>
            <option value="temporairement_ferme">Temporairement fermé</option>
          </select>
          <div className="toggle-group" style={{ flexShrink: 0 }}>
            <button className={`toggle-btn ${view === 'list' ? 'toggle-active' : ''}`}
              onClick={() => setView('list')}>Liste</button>
            <button className={`toggle-btn ${view === 'map' ? 'toggle-active' : ''}`}
              onClick={() => setView('map')}>Carte</button>
          </div>
        </div>
      </div>

      {!loading && pagination && (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
          {pagination.total} résultat{pagination.total !== 1 ? 's' : ''}
          {q && <> pour &laquo;&nbsp;{q}&nbsp;&raquo;</>}
        </p>
      )}

      {loading && (
        <div className="grid grid-cards">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {!loading && bibliotheques.length === 0 && (
        <div className="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <p className="empty-state-title">Aucune bibliothèque trouvée</p>
          {q ? <p>Essayez avec d'autres termes ou modifiez les filtres.</p>
            : <p>Modifiez vos critères de recherche.</p>}
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
        <div className="map-container" style={{ height: '60vh', minHeight: '350px' }}>
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
              onClick={() => setSearchParams(buildParams({ page: page - 1 }))}>
              Précédent
            </button>
          )}
          <span className="pagination-info">
            Page {page} / {pagination.pages}
          </span>
          {page < pagination.pages && (
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSearchParams(buildParams({ page: page + 1 }))}>
              Suivant
            </button>
          )}
        </div>
      )}
    </main>
  );
}
