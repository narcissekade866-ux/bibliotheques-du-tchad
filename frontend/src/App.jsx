import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LightModeProvider } from './contexts/LightModeContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Search from './pages/Search';
import BiblioDetail from './pages/BiblioDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import MonEspace from './pages/MonEspace';
import SaisieTerrain from './pages/SaisieTerrain';
import Stats from './pages/Stats';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LightModeProvider>
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/recherche" element={<Search />} />
            <Route path="/bibliotheque/:id" element={<BiblioDetail />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/inscription" element={<Register />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/mon-espace" element={<MonEspace />} />
            <Route path="/saisie-terrain" element={<SaisieTerrain />} />
            <Route path="/statistiques" element={<Stats />} />
          </Routes>
          <Footer />
        </LightModeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
