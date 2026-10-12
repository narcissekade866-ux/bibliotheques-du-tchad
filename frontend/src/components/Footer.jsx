import { useLightMode } from '../contexts/LightModeContext';

export default function Footer() {
  const { lightMode, toggle } = useLightMode();

  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>Bibliofinder &middot; SAYBA / Eureka+</span>
        <button
          onClick={toggle}
          className="btn-ghost btn-sm"
          style={{ fontSize: '12px', color: 'var(--text-muted)' }}
          title={lightMode ? 'Désactiver le mode allégé' : 'Activer le mode allégé (sans images ni carte)'}
        >
          {lightMode ? '◉ Mode allégé actif' : '○ Mode allégé'}
        </button>
        <span>Tchad</span>
      </div>
    </footer>
  );
}
