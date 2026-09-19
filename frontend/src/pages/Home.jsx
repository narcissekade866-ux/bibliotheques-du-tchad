import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../services/api';
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

  const center = ville
    ? [parseFloat(ville.centre_lat), parseFloat(ville.centre_long)]
    : [12.1048, 15.0445];
  const zoom = ville ? ville.zoom_defaut : 13;

  return (
    <main>
      <section style={{
        padding: '32px 16px',
        textAlign: 'center',
        background: 'var(--bg-alt)',
      }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '28px' }}>
          Bibliothèques du Tchad
        </h1>
        <p style={{ margin: '0 0 20px', color: 'var(--text-light)' }}>
          Trouvez une bibliothèque près de chez vous
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SearchBar onSearch={handleSearch} />
        </div>
        {!loading && (
          <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--text-light)' }}>
            {bibliotheques.length} bibliothèque{bibliotheques.length !== 1 ? 's' : ''} référencée{bibliotheques.length !== 1 ? 's' : ''}
          </p>
        )}
      </section>

      <section style={{ height: '50vh', minHeight: '300px' }}>
        {!loading && (
          <MapView
            bibliotheques={bibliotheques}
            center={center}
            zoom={zoom}
            onMarkerClick={handleMarkerClick}
          />
        )}
      </section>

      {bibliotheques.length > 0 && (
        <section className="container" style={{ padding: '24px 16px' }}>
          <h2 style={{ fontSize: '20px', margin: '0 0 16px' }}>
            Dernières bibliothèques ajoutées
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}>
            {bibliotheques.slice(0, 6).map((b) => (
              <BiblioCard key={b.id} biblio={b} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
