import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NetworkProvider } from './contexts/NetworkContext';
import { CartProvider } from './contexts/CartContext';
import PublicMenu from './pages/PublicMenu';
import LandingPage from './pages/LandingPage';
import { getEstablishmentSlug } from './services/api';

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
      {/* Fallback backward compatibility for path-based routes */}
      <Route path="/:est" element={<PublicMenu />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId="190788590463-vmt6leseuk1o1g8knrsi6f6he801ga1l.apps.googleusercontent.com">
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
