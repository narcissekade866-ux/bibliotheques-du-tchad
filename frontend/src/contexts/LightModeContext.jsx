import { createContext, useContext, useState } from 'react';

const LightModeContext = createContext(null);

export function LightModeProvider({ children }) {
  const [lightMode, setLightMode] = useState(() => {
    try { return localStorage.getItem('bibliofinder_light_mode') === 'true'; }
    catch { return false; }
  });

  function toggle() {
    setLightMode((prev) => {
      const next = !prev;
      try { localStorage.setItem('bibliofinder_light_mode', String(next)); }
      catch { /* ignore */ }
      return next;
    });
  }

  return (
    <LightModeContext.Provider value={{ lightMode, toggle }}>
      {children}
    </LightModeContext.Provider>
  );
}

export function useLightMode() {
  const ctx = useContext(LightModeContext);
  if (!ctx) throw new Error('useLightMode must be used within LightModeProvider');
  return ctx;
}
