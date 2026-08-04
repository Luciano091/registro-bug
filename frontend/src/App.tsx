import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, ListOrdered, Utensils, BarChart3, Settings as SettingsIcon, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CashFlow from './pages/CashFlow';
import WhatsApp from './pages/WhatsApp';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { WifiOff, RefreshCcw, MessageCircle } from 'lucide-react';

const NetworkBanner = () => {
  const { isOnline, isSyncing } = useNetwork();
  
  if (isOnline && !isSyncing) return null;
  
  return (
    <div className={`absolute top-0 left-0 w-full z-[100] py-1.5 px-4 flex justify-center items-center gap-2 text-sm font-bold shadow-lg transition-colors ${!isOnline ? 'bg-red-500/90 backdrop-blur-sm text-white' : 'bg-emerald-500/90 backdrop-blur-sm text-white'}`}>
      {!isOnline ? (
        <>
          <WifiOff size={16} /> Você está Offline. Os pedidos estão sendo salvos localmente no caixa.
        </>
      ) : (
        <>
          <RefreshCcw size={16} className="animate-spin" /> Restaurando conexão: sincronizando pedidos pendentes...
        </>
      )}
    </div>
  );
};

const NavLink = ({ to, icon: Icon, children, isCollapsed }: { to: string, icon: any, children: React.ReactNode, isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      title={isCollapsed ? children as string : undefined}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 font-medium relative group ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-transparent rounded-xl border border-brand-500/30 shadow-[inset_0px_1px_1px_rgba(255,255,255,0.1)]"></div>
      )}
      {!isActive && (
        <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
      <Icon size={20} className={`relative z-10 transition-colors flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      {!isCollapsed && <span className="relative z-10 whitespace-nowrap transition-opacity duration-300">{children}</span>}
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>}
    </Link>
  );
};

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <NetworkProvider>
      <AppDataProvider>
      <Router>
        <div className="flex h-screen bg-[#0a0a0a] text-zinc-50 overflow-hidden font-sans relative">
          <NetworkBanner />
        {/* Global Background Image */}
        <div 
          className="absolute inset-0 z-0 opacity-70 pointer-events-none bg-no-repeat bg-center bg-cover mix-blend-screen"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=2000&q=80')" }}
        ></div>
        {/* Soft Vignette */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.75)_100%)] pointer-events-none"></div>
        <div className="absolute inset-0 z-0 bg-black/30 pointer-events-none"></div>

        {/* Ambient Background Glows */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-500/15 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] translate-x-1/3 translate-y-1/3 pointer-events-none z-0"></div>

        {/* Sidebar */}
        <aside className={`${isCollapsed ? 'w-24' : 'w-64'} transition-all duration-300 ease-in-out glass border-r border-white/5 flex flex-col hidden md:flex z-10 relative print:hidden`}>
          <div className={`pt-6 px-4 pb-2 h-24 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-2 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=100&q=80" alt="Logo Burger Hause" className="w-8 h-8 rounded-full object-cover shadow-lg border border-brand-500/50" />
                <div className="flex flex-col items-center w-full">
                  <h1 className="text-lg font-bold gradient-text drop-shadow-sm whitespace-nowrap leading-tight">
                    Burger Hause
                  </h1>
                  <span className="text-[10px] text-white font-bold tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">O Lanche</span>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors flex-shrink-0"
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-x-hidden overflow-y-auto custom-scrollbar">
            <NavLink to="/" icon={Home} isCollapsed={isCollapsed}>Dashboard</NavLink>
            <NavLink to="/novo-pedido" icon={PlusCircle} isCollapsed={isCollapsed}>Novo Pedido</NavLink>
            <NavLink to="/pedidos" icon={ListOrdered} isCollapsed={isCollapsed}>Pedidos</NavLink>
            <NavLink to="/whatsapp" icon={MessageCircle} isCollapsed={isCollapsed}>WhatsApp</NavLink>
            <NavLink to="/caixa" icon={Wallet} isCollapsed={isCollapsed}>Caixa</NavLink>
            <NavLink to="/cardapio" icon={Utensils} isCollapsed={isCollapsed}>Cardápio</NavLink>
            <NavLink to="/relatorios" icon={BarChart3} isCollapsed={isCollapsed}>Relatórios</NavLink>
            <NavLink to="/configuracoes" icon={SettingsIcon} isCollapsed={isCollapsed}>Configurações</NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0 z-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/novo-pedido" element={<NewOrder />} />
            <Route path="/pedidos" element={<Orders />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/caixa" element={<CashFlow />} />
            <Route path="/cardapio" element={<Menu />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Routes>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 w-full glass border-t border-white/10 flex justify-around p-2 z-50 print:hidden">
          <Link to="/" className="p-3 text-zinc-400 hover:text-brand-400 transition-colors"><Home size={24} /></Link>
          <Link to="/novo-pedido" className="p-4 premium-btn rounded-full -mt-8 shadow-xl"><PlusCircle size={28} /></Link>
          <Link to="/pedidos" className="p-3 text-zinc-400 hover:text-brand-400 transition-colors"><ListOrdered size={24} /></Link>
        </nav>
      </div>
      </Router>
      </AppDataProvider>
    </NetworkProvider>
  );
}

export default App;
