import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, ListOrdered, Utensils, BarChart3, Settings as SettingsIcon, ChevronLeft, ChevronRight, Wallet, LogOut, Menu as MenuIcon, X, Package, Store, Users, Armchair, ChefHat, Truck } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import CashFlow from './pages/CashFlow';
import Insumos from './pages/Insumos';
import PlatformLogin from './pages/PlatformLogin';
import PlatformDashboard from './pages/PlatformDashboard';
import Team from './pages/Team';
import Salon from './pages/Salon';
import Kitchen from './pages/Kitchen';
import Deliveries from './pages/Deliveries';

import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { Navigate } from 'react-router-dom';
import { NetworkProvider, useNetwork } from './contexts/NetworkContext';
import { AppDataProvider } from './contexts/AppDataContext';
import { WifiOff, RefreshCcw } from 'lucide-react';
import api from './services/api';
import { can, readSession, type SessionUser } from './services/session';

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

const NavLink = ({ to, icon: Icon, children, isCollapsed, hasBadge }: { to: string, icon: any, children: React.ReactNode, isCollapsed: boolean, hasBadge?: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link 
      to={to} 
      title={isCollapsed ? children as string : undefined}
      aria-current={isActive ? "page" : undefined}
      className={`sidebar-link flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-300 font-medium relative group ${isActive ? 'text-white' : 'text-zinc-300 hover:text-white'}`}
    >
      {isActive && (
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-transparent rounded-xl border border-brand-500/30 shadow-[inset_0px_1px_1px_rgba(255,255,255,0.1)]"></div>
      )}
      {!isActive && (
        <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
      <div className="relative">
        <Icon size={20} className={`relative z-10 transition-colors flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
        {hasBadge && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,1)] border-[1.5px] border-dark-950 z-20 animate-pulse"></span>
        )}
      </div>
      {!isCollapsed && <span className="relative z-10 whitespace-nowrap transition-opacity duration-300">{children}</span>}
      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-500 rounded-r-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>}
    </Link>
  );
};

const ProtectedRoute = ({ children, permission, user }: { children: React.ReactNode, permission?: string, user?: SessionUser | null }) => {
  const isAuthenticated = localStorage.getItem('adminToken') !== null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !can(user ?? null, permission)) {
    return <div className="p-10"><div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center"><h1 className="text-2xl font-bold text-slate-900">Acesso restrito</h1><p className="text-slate-500 mt-2">Sua função não possui permissão para abrir esta área.</p></div></div>;
  }
  return <>{children}</>;
};

const HomeRoute = ({ user }: { user: SessionUser | null }) => {
  if (can(user, 'dashboard.visualizar')) return <Dashboard />;
  if (can(user, 'cozinha.operar')) return <Navigate to="/cozinha" replace />;
  if (can(user, 'entregas.operar')) return <Navigate to="/entregas" replace />;
  if (can(user, 'salao.operar')) return <Navigate to="/salao" replace />;
  if (can(user, 'pedidos.visualizar')) return <Navigate to="/pedidos" replace />;
  if (can(user, 'cardapio.visualizar')) return <Navigate to="/cardapio" replace />;
  return <div className="p-10 text-center text-slate-600">Seu acesso ainda não possui uma área operacional disponível.</div>;
};

function AppContent() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [estabelecimento, setEstabelecimento] = useState<{ nome_empresa?: string; logo?: string }>({});
  const [session, setSession] = useState<SessionUser | null>(readSession());
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';
  const isPlatformHost = window.location.hostname.toLowerCase().startsWith('admin.');
  const isPlatformRoute = location.pathname.startsWith('/ritmesa-admin');
  const isPlatformArea = isPlatformHost || isPlatformRoute;

  useEffect(() => {
    if (isLoginRoute || isPlatformArea || !localStorage.getItem('adminToken')) return;
    api.get('/configuracao')
      .then(({ data }) => setEstabelecimento(data || {}))
      .catch(() => setEstabelecimento({}));
  }, [isLoginRoute, isPlatformArea]);

  useEffect(() => {
    if (isLoginRoute || isPlatformArea || !localStorage.getItem('adminToken')) return;
    api.get('/auth/me').then(({ data }) => {
      localStorage.setItem('ritmesaSession', JSON.stringify(data));
      setSession(data);
    }).catch(() => undefined);
  }, [isLoginRoute, isPlatformArea]);

  if (isPlatformArea) {
    return (
      <Routes>
        {isPlatformHost && <Route path="/login" element={<PlatformLogin />} />}
        {isPlatformHost && <Route path="/" element={<PlatformDashboard />} />}
        <Route path="/ritmesa-admin/login" element={<PlatformLogin />} />
        <Route path="/ritmesa-admin" element={<PlatformDashboard />} />
        <Route path="*" element={<Navigate to={isPlatformHost ? '/' : '/ritmesa-admin'} replace />} />
      </Routes>
    );
  }
  
  if (isLoginRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    );
  }

  return (
    <div className="admin-shell flex h-screen text-zinc-900 overflow-hidden font-sans relative">
          <NetworkBanner />
        {/* Sidebar */}
        <aside className={`admin-sidebar ${isCollapsed ? 'w-20' : 'w-[268px]'} transition-all duration-300 ease-in-out flex flex-col hidden md:flex z-10 relative print:hidden`}>
          <div className={`px-4 h-20 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="brand-mark"><img src="/brand/ritmesa-mark.png" alt="" /></div>
                <div className="min-w-0">
                  <h1 className="text-[17px] font-bold text-white whitespace-nowrap leading-tight">
                    Ritmesa
                  </h1>
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">Pedidos e gestão</span>
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors flex-shrink-0"
              title={isCollapsed ? "Expandir" : "Recolher"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-x-hidden overflow-y-auto custom-scrollbar">
            {!isCollapsed && <span className="nav-section-label">Operação</span>}
            {can(session, 'dashboard.visualizar') && <NavLink to="/" icon={Home} isCollapsed={isCollapsed}>Dashboard</NavLink>}
            {can(session, 'pedidos.criar') && <NavLink to="/novo-pedido" icon={PlusCircle} isCollapsed={isCollapsed}>Novo Pedido</NavLink>}
            {can(session, 'pedidos.visualizar') && session?.perfil !== 'entregador' && <NavLink to="/pedidos" icon={ListOrdered} isCollapsed={isCollapsed}>Pedidos</NavLink>}
            {can(session, 'salao.operar') && <NavLink to="/salao" icon={Armchair} isCollapsed={isCollapsed}>Salão</NavLink>}
            {can(session, 'cozinha.operar') && <NavLink to="/cozinha" icon={ChefHat} isCollapsed={isCollapsed}>Cozinha</NavLink>}
            {can(session, 'entregas.visualizar') && <NavLink to="/entregas" icon={Truck} isCollapsed={isCollapsed}>Entregas</NavLink>}
            {can(session, 'caixa.visualizar') && <NavLink to="/caixa" icon={Wallet} isCollapsed={isCollapsed}>Caixa</NavLink>}

            {!isCollapsed && <span className="nav-section-label mt-5">Gestão</span>}
            {can(session, 'cardapio.visualizar') && <NavLink to="/cardapio" icon={Utensils} isCollapsed={isCollapsed}>Cardápio</NavLink>}
            {can(session, 'estoque.visualizar') && <NavLink to="/insumos" icon={Package} isCollapsed={isCollapsed}>Insumos</NavLink>}
            {can(session, 'relatorios.visualizar') && <NavLink to="/relatorios" icon={BarChart3} isCollapsed={isCollapsed}>Relatórios</NavLink>}
            {can(session, 'usuarios.visualizar') && <NavLink to="/equipe" icon={Users} isCollapsed={isCollapsed}>Equipe</NavLink>}
            {can(session, 'configuracoes.visualizar') && session?.perfil !== 'entregador' && <NavLink to="/configuracoes" icon={SettingsIcon} isCollapsed={isCollapsed}>Configurações</NavLink>}
          </nav>
          
          <div className="p-3 border-t border-white/5 mt-auto space-y-1">
            {!isCollapsed && (
              <div className="tenant-card mb-3">
                {estabelecimento.logo ? (
                  <img src={estabelecimento.logo} alt="Identidade do estabelecimento" className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/10 text-slate-300 grid place-items-center"><Store size={17} /></div>
                )}
                <div className="min-w-0 flex-1">
                  <strong className="block text-sm text-white truncate">{estabelecimento.nome_empresa || 'Meu estabelecimento'}</strong>
                  <span className="text-[11px] text-slate-400">Unidade atual</span>
                </div>
              </div>
            )}
            <button 
              onClick={() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('ritmesaSession');
                window.location.href = '/login';
              }}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-2.5 rounded-lg transition-all duration-200 font-medium text-slate-400 hover:text-white hover:bg-white/5`}
              title={isCollapsed ? "Sair do Sistema" : undefined}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!isCollapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="admin-main min-w-0 flex-1 overflow-y-auto relative pb-20 md:pb-0 z-10">
          <div className="mobile-brand md:hidden">
            {estabelecimento.logo ? (
              <img src={estabelecimento.logo} alt={`Logo de ${estabelecimento.nome_empresa || 'estabelecimento'}`} className="mobile-tenant-logo" />
            ) : (
              <div className="mobile-tenant-logo mobile-tenant-placeholder"><Store size={20} /></div>
            )}
            <div className="min-w-0">
              <strong className="truncate">{estabelecimento.nome_empresa || 'Meu estabelecimento'}</strong>
              <span className="flex items-center gap-1.5"><img src="/brand/ritmesa-mark.png" alt="" /> Gestão por Ritmesa</span>
            </div>
          </div>
          <Routes>
            <Route path="/" element={<ProtectedRoute user={session}><HomeRoute user={session} /></ProtectedRoute>} />
            <Route path="/novo-pedido" element={<ProtectedRoute permission="pedidos.criar" user={session}><NewOrder /></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute permission="pedidos.visualizar" user={session}><Orders /></ProtectedRoute>} />
            <Route path="/salao" element={<ProtectedRoute permission="salao.operar" user={session}><Salon /></ProtectedRoute>} />
            <Route path="/cozinha" element={<ProtectedRoute permission="cozinha.operar" user={session}><Kitchen /></ProtectedRoute>} />
            <Route path="/entregas" element={<ProtectedRoute permission="entregas.visualizar" user={session}><Deliveries /></ProtectedRoute>} />

            <Route path="/caixa" element={<ProtectedRoute permission="caixa.visualizar" user={session}><CashFlow /></ProtectedRoute>} />
            <Route path="/cardapio" element={<ProtectedRoute permission="cardapio.visualizar" user={session}><Menu /></ProtectedRoute>} />
            <Route path="/insumos" element={<ProtectedRoute permission="estoque.visualizar" user={session}><Insumos /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute permission="relatorios.visualizar" user={session}><Reports /></ProtectedRoute>} />
            <Route path="/equipe" element={<ProtectedRoute permission="usuarios.visualizar" user={session}><Team /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute permission="configuracoes.visualizar" user={session}><Settings /></ProtectedRoute>} />
          </Routes>
        </main>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-xl flex flex-col p-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center mb-8 mt-4">
              <h2 className="text-2xl font-heading font-bold text-white">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-white/10 rounded-full text-zinc-200 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-col gap-4 overflow-y-auto">
              {can(session, 'salao.operar') && <Link to="/salao" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><Armchair className="text-brand-400" /> Salão e comandas</Link>}
              {can(session, 'cozinha.operar') && <Link to="/cozinha" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><ChefHat className="text-brand-400" /> Painel de cozinha</Link>}
              {can(session, 'entregas.visualizar') && <Link to="/entregas" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><Truck className="text-brand-400" /> Entregas</Link>}
              {can(session, 'caixa.visualizar') && <Link to="/caixa" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><Wallet className="text-brand-400" /> Caixa</Link>}
              {can(session, 'estoque.visualizar') && <Link to="/insumos" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><Package className="text-brand-400" /> Insumos</Link>}
              {can(session, 'relatorios.visualizar') && <Link to="/relatorios" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><BarChart3 className="text-brand-400" /> Relatórios</Link>}
              {can(session, 'usuarios.visualizar') && <Link to="/equipe" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><Users className="text-brand-400" /> Equipe</Link>}
              {can(session, 'configuracoes.visualizar') && session?.perfil !== 'entregador' && <Link to="/configuracoes" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 p-4 glass-card rounded-2xl text-lg font-medium"><SettingsIcon className="text-brand-400" /> Configurações</Link>}
              
              <div className="mt-8">
                <button 
                  onClick={() => {
                    localStorage.removeItem('adminToken');
                    localStorage.removeItem('ritmesaSession');
                    window.location.href = '/login';
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-lg font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <LogOut /> Sair
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Mobile Bottom Nav */}
        <nav className="mobile-bottom-nav fixed bottom-0 z-50 flex w-full justify-between px-2 py-1.5 md:hidden print:hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {can(session, 'dashboard.visualizar') && <Link to="/" aria-current={location.pathname === '/' ? 'page' : undefined} className={`mobile-nav-item ${location.pathname === '/' ? 'is-active' : ''}`}><Home size={22} /><span>Início</span></Link>}
          {can(session, 'pedidos.visualizar') && session?.perfil !== 'entregador' && <Link to="/pedidos" aria-current={location.pathname === '/pedidos' ? 'page' : undefined} className={`mobile-nav-item ${location.pathname === '/pedidos' ? 'is-active' : ''}`}><ListOrdered size={22} /><span>Pedidos</span></Link>}
          {can(session, 'cozinha.operar') && !can(session, 'dashboard.visualizar') && <Link to="/cozinha" aria-current={location.pathname === '/cozinha' ? 'page' : undefined} className={`mobile-nav-item ${location.pathname === '/cozinha' ? 'is-active' : ''}`}><ChefHat size={22} /><span>Cozinha</span></Link>}
          {can(session, 'entregas.operar') && !can(session, 'dashboard.visualizar') && <Link to="/entregas" aria-current={location.pathname === '/entregas' ? 'page' : undefined} className={`mobile-nav-item ${location.pathname === '/entregas' ? 'is-active' : ''}`}><Truck size={22} /><span>Entregas</span></Link>}
          
          {can(session, 'pedidos.criar') && <Link to="/novo-pedido" aria-label="Novo pedido" className="relative -top-6 p-4 premium-btn rounded-full shadow-xl shadow-brand-500/20 border-4 border-white">
            <PlusCircle size={28} />
          </Link>}
          
          {can(session, 'cardapio.visualizar') && <Link to="/cardapio" aria-current={location.pathname === '/cardapio' ? 'page' : undefined} className={`mobile-nav-item ${location.pathname === '/cardapio' ? 'is-active' : ''}`}><Utensils size={22} /><span>Cardápio</span></Link>}
          <button onClick={() => setIsMobileMenuOpen(true)} className={`mobile-nav-item ${isMobileMenuOpen ? 'is-active' : ''}`}><MenuIcon size={22} /><span>Mais</span></button>
        </nav>
      </div>
  );
}

function App() {
  return (
    <NetworkProvider>
      <AppDataProvider>
        <Router>
          <AppContent />
        </Router>
      </AppDataProvider>
    </NetworkProvider>
  );
}

export default App;
