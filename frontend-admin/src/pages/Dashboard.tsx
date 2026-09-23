import { useEffect } from 'react';
import { Package, DollarSign, Receipt, TrendingUp, Store } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAppData } from '../contexts/AppDataContext';

const Dashboard = () => {
  const { dashboardResumo: resumo, refreshDashboard } = useAppData();



  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);


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
    <div className="dashboard-page relative min-h-[calc(100vh-2rem)] p-5 md:p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      <div className="relative z-10 space-y-6">
        <header className="dashboard-header flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <p className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-1">Visão geral</p>
            <h2 className="text-2xl font-bold tracking-tight text-white">Visão geral da operação</h2>
            <p className="text-zinc-300 mt-0.5">Acompanhe os principais números da operação de hoje.</p>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-brand-600 grid place-items-center"><Store size={16} /></div>
            <div>
              <span className="block text-[11px] leading-tight text-slate-500">Ambiente atual</span>
              <strong className="text-sm leading-tight text-slate-700">Painel administrativo</strong>
            </div>
          </div>
      </header>

      <div className="dashboard-stats grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Card 1 */}
        <div className="glass-card p-4 rounded-xl group flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Pedidos Hoje</p>
            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-500 flex-shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-colors duration-300">
              <Package size={18} />
            </div>
          </div>
          <h3 className="text-2xl mt-1 font-bold text-white group-hover:text-brand-400 transition-colors truncate font-heading">{resumo.pedidos_hoje}</h3>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-4 rounded-xl group flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-start relative z-10">
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Faturamento</p>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className="text-2xl mt-1 font-bold text-white group-hover:text-emerald-400 transition-colors truncate font-heading relative z-10">
            {resumo.faturamento_hoje.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-4 rounded-xl group flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-start relative z-10">
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Ticket Médio</p>
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              <Receipt size={18} />
            </div>
          </div>
          <h3 className="text-2xl mt-1 font-bold text-white group-hover:text-blue-400 transition-colors truncate font-heading relative z-10">
            {resumo.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h3>
        </div>

        {/* Card 4 - Lucro Líquido */}
        <div className="glass-card p-4 rounded-xl group flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-start relative z-10">
            <p className="text-[11px] uppercase tracking-wider font-bold text-zinc-400">Lucro Líquido</p>
            <div className="p-2 bg-violet-500/10 rounded-lg text-violet-500 flex-shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
              <TrendingUp size={18} />
            </div>
          </div>
          <h3 className="text-2xl mt-1 font-bold text-white group-hover:text-violet-400 transition-colors truncate font-heading relative z-10">
            {resumo.lucro_hoje?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5 rounded-xl">
          <h3 className="text-lg font-bold mb-4 font-heading">Vendas dos Últimos 7 Dias</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#172033', boxShadow: '0 10px 30px -8px rgba(15,23,42,0.18)' }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  // @ts-ignore
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Vendas']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorVendas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex flex-col">
          <h3 className="text-lg font-bold mb-4 font-heading">Últimos Pedidos</h3>
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {resumo.ultimos_pedidos.length === 0 ? (
              <p className="dashboard-empty text-zinc-400 text-sm"><Receipt size={28} strokeWidth={1.5} className="text-zinc-500 mb-3" />Nenhum pedido hoje.</p>
            ) : (
              resumo.ultimos_pedidos.map((pedido: any) => (
                <div key={pedido.id} className="flex justify-between items-center p-3 bg-dark-900/50 rounded-lg border border-white/5 hover:border-white/10 hover:bg-dark-900/80 transition-all cursor-default">
                  <div>
                    <p className="font-bold">Pedido #{pedido.numero.split('-').pop() || pedido.numero}</p>
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
