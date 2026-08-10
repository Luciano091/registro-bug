import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NetworkProvider } from './contexts/NetworkContext';
import { CartProvider } from './contexts/CartContext';
import PublicMenu from './pages/PublicMenu';

function App() {
  return (
    <NetworkProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#0F0F11]">
            <Routes>
              <Route path="/" element={<PublicMenu />} />
              <Route path="/:estabelecimento" element={<PublicMenu />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </NetworkProvider>
  );
}

export default App;
