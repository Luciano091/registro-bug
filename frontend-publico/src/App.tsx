import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { NetworkProvider } from './contexts/NetworkContext';
import { CartProvider } from './contexts/CartContext';
import PublicMenu from './pages/PublicMenu';

function App() {
  return (
    <GoogleOAuthProvider clientId="190788590463-vmt6leseuk1o1g8knrsi6f6he801ga1l.apps.googleusercontent.com">
      <NetworkProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-zinc-50">
              <Routes>
                <Route path="/" element={<PublicMenu />} />
                <Route path="/:estabelecimento" element={<PublicMenu />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </CartProvider>
      </NetworkProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
