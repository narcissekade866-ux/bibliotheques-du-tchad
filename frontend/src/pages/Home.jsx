import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
import { useLightMode } from '../contexts/LightModeContext';
import SearchBar from '../components/SearchBar';
import MapView from '../components/MapView';
import BiblioCard from '../components/BiblioCard';

export default function Home() {
  const [bibliotheques, setBibliotheques] = useState([]);
  const [ville, setVille] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [biblioData, villesData] = await Promise.all([
          apiGet('/bibliotheques?limit=50'),
          apiGet('/villes'),
        ]);
        setBibliotheques(biblioData.bibliotheques || []);
        if (villesData.length > 0) setVille(villesData[0]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleSearch(q) {
    navigate(`/recherche?q=${encodeURIComponent(q)}`);
  }

  function handleMarkerClick(biblio) {
    navigate(`/bibliotheque/${biblio.id}`);
  }

  const { lightMode } = useLightMode();

  const center = ville
    ? [parseFloat(ville.centre_lat), parseFloat(ville.centre_long)]
    : [12.1048, 15.0445];
  const zoom = ville ? ville.zoom_defaut : 13;

  return (
    <main style={{ flex: 1 }}>
      <section className="hero">
        <div className="container">
          <h1>Bibliofinder</h1>
          <p>Cartographie des bibliothèques du Tchad</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <SearchBar onSearch={handleSearch} />
          </div>
          {!loading && (
            <div className="hero-count">
              {bibliotheques.length} bibliothèque{bibliotheques.length !== 1 ? 's' : ''} référencée{bibliotheques.length !== 1 ? 's' : ''}
            </div>
          )}
          <p className="hero-notice">
            Ce répertoire est en cours de constitution. De nouvelles fiches sont ajoutées régulièrement.
          </p>
        </div>
      </section>

      {!lightMode && (
        <section style={{ height: '50vh', minHeight: '300px' }}>
          {loading ? (
            <div className="skeleton" style={{ height: '100%', borderRadius: 0 }} />
          ) : (
            <MapView
              bibliotheques={bibliotheques}
              center={center}
              zoom={zoom}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </section>
      )}

      {bibliotheques.length > 0 && (
        <section className="container" style={{ padding: '36px 16px 40px' }}>
          <h2 style={{ margin: '0 0 20px' }}>
            Dernières bibliothèques ajoutées
          </h2>
          <div className="grid grid-cards">
            {bibliotheques.slice(0, 6).map((b) => (
              <BiblioCard key={b.id} biblio={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
