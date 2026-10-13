import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('bibliofinder_theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* ignore */ }
  return 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('bibliofinder_theme', theme); }
    catch { /* ignore */ }
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
