import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import BiblioDetail from './pages/BiblioDetail';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recherche" element={<Search />} />
        <Route path="/bibliotheque/:id" element={<BiblioDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
