import { useEffect } from 'react';
import { Package, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppData } from '../contexts/AppDataContext';

const Dashboard = () => {
  const { dashboardResumo: resumo, dashboardLoaded, refreshDashboard } = useAppData();



  useEffect(() => {
    if (!dashboardLoaded) refreshDashboard();
    else refreshDashboard(); // Always refresh in background
  }, [dashboardLoaded, refreshDashboard]);


  const data = resumo.vendas_semana || [
    { name: 'Seg', vendas: 0 },
    { name: 'Ter', vendas: 0 },
    { name: 'Qua', vendas: 0 },
    { name: 'Qui', vendas: 0 },
    { name: 'Sex', vendas: 0 },
    { name: 'Sáb', vendas: 0 },
    { name: 'Dom', vendas: 0 },
  ];

  return (
    <div className="relative min-h-[calc(100vh-2rem)] p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="relative z-10 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">Dashboard</h2>
            <p className="text-zinc-300 mt-1">Visão geral do desempenho de hoje.</p>
          </div>

      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1 */}
        <div className="glass-card p-5 rounded-2xl group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">Pedidos Hoje</p>
            <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-500 flex-shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
              <Package size={20} />
            </div>
          </div>
          <h3 className="text-4xl mt-2 font-bold text-white group-hover:text-brand-400 transition-colors truncate font-heading">{resumo.pedidos_hoje}</h3>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-5 rounded-2xl group flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">Faturamento</p>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <DollarSign size={20} />
            </div>
          </div>
          <h3 className="text-4xl mt-2 font-bold text-white group-hover:text-emerald-400 transition-colors truncate font-heading relative z-10">
            {resumo.faturamento_hoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-5 rounded-2xl group flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">Ticket Médio</p>
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              <Receipt size={20} />
            </div>
          </div>
          <h3 className="text-4xl mt-2 font-bold text-white group-hover:text-blue-400 transition-colors truncate font-heading relative z-10">
            {resumo.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>

        {/* Card 4 - Lucro Líquido */}
        <div className="glass-card p-5 rounded-2xl group flex flex-col justify-between overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all duration-500"></div>
          <div className="flex justify-between items-start mb-2 relative z-10">
            <p className="text-xs uppercase tracking-wider font-bold text-zinc-400">Lucro Líquido</p>
            <div className="p-2.5 bg-violet-500/10 rounded-xl text-violet-500 flex-shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
              <TrendingUp size={20} />
            </div>
          </div>
          <h3 className="text-4xl mt-2 font-bold text-white group-hover:text-violet-400 transition-colors truncate font-heading relative z-10">
            {resumo.lucro_hoje?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-bold mb-6 font-heading">Vendas dos Últimos 7 Dias</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121214cc', backdropFilter: 'blur(10px)', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  // @ts-ignore
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Vendas']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex flex-col">
          <h3 className="text-xl font-bold mb-6 font-heading">Últimos Pedidos</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {resumo.ultimos_pedidos.length === 0 ? (
              <p className="text-zinc-400 text-sm">Nenhum pedido hoje.</p>
            ) : (
              resumo.ultimos_pedidos.map((pedido: any) => (
                <div key={pedido.id} className="flex justify-between items-center p-4 bg-dark-900/50 rounded-xl border border-white/5 hover:border-white/10 hover:bg-dark-900/80 transition-all cursor-default">
                  <div>
                    <p className="font-bold">Pedido {pedido.numero}</p>
                    <p className="text-xs text-zinc-300 mt-1">{pedido.cliente}</p>
                  </div>
                  <div className="bg-brand-500/20 text-brand-400 px-3 py-1 rounded-lg text-xs font-bold border border-brand-500/20 shadow-[inset_0px_1px_1px_rgba(255,255,255,0.05)]">
                    {pedido.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Dashboard;
