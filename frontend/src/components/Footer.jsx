import { useLightMode } from '../contexts/LightModeContext';

export default function Footer() {
  const { lightMode, toggle } = useLightMode();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Bibliofinder</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>SAYBA / Eureka+</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={toggle}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 10px' }}
            aria-pressed={lightMode}
            title={lightMode ? 'Désactiver le mode allégé' : 'Activer le mode allégé (sans images ni carte)'}
          >
            {lightMode ? 'Mode allégé actif' : 'Mode allégé'}
          </button>
          <span>Tchad</span>
        </div>
      </div>
    </footer>
  );
}
