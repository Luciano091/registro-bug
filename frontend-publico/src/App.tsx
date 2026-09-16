import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NetworkProvider } from './contexts/NetworkContext';
import { CartProvider } from './contexts/CartContext';
import PublicMenu from './pages/PublicMenu';
import LandingPage from './pages/LandingPage';
import { getEstablishmentSlug } from './services/api';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '836965237182-kmgamm79oo3ft7kgifqom9ulj5u37mt2.apps.googleusercontent.com';

function AppRouter() {
  const slug = getEstablishmentSlug();

  // If there's no slug (e.g., accessing ritmesa.com.br directly)
  if (!slug) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // If there is a slug (e.g., bisburger.ritmesa.com.br or localhost:5173/bisburger)
  return (
    <Routes>
      <Route path="/" element={<PublicMenu />} />
      <Route path="/mesa/:mesaNumero" element={<PublicMenu />} />
      {/* Fallback backward compatibility for path-based routes */}
      <Route path="/:est" element={<PublicMenu />} />
      <Route path="/:est/mesa/:mesaNumero" element={<PublicMenu />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId} locale="pt-BR">
      <NetworkProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-zinc-50">
              <AppRouter />
            </div>
          </Router>
        </CartProvider>
      </NetworkProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
