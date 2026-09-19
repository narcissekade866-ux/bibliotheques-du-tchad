import { useState } from 'react';

export default function SearchBar({ onSearch, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(e) {
    e.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      gap: '8px',
      width: '100%',
      maxWidth: '600px',
    }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une bibliothèque (nom, quartier...)"
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn-primary">Rechercher</button>
    </form>
  );
}
