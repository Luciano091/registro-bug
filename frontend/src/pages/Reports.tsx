import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

const Reports = () => {
  const [data, setData] = useState({
    resumo_diario: { pedidos: 0, faturamento: 0, vendas_pagamento: [] as any[] },
    vendas_semana: [] as any[],
    produtos_mes: [] as any[],
    metricas_mes: { total_pedidos: 0, faturamento: 0, ticket_medio: 0 }
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/dashboard/relatorios');
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 custom-scrollbar">
      <header>
        <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Relatórios</h2>
        <p className="text-zinc-400 mt-1">Acompanhe as métricas de vendas e produtos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Resumo Diário */}
        <div className="glass-card p-6 rounded-2xl space-y-6 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-500/20 transition-all duration-500"></div>
          
          <h3 className="text-xl font-bold text-white font-heading border-b border-white/5 pb-2 relative z-10">Resumo Diário</h3>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-dark-900/50 p-4 rounded-xl border border-white/5 transition-all duration-300 group-hover:border-white/10">
              <p className="text-xs text-zinc-500">Pedidos</p>
              <p className="text-2xl font-bold text-white font-heading mt-1">{data.resumo_diario.pedidos}</p>
            </div>
            <div className="bg-dark-900/50 p-4 rounded-xl border border-white/5 transition-all duration-300 group-hover:border-white/10">
              <p className="text-xs text-zinc-500">Faturamento</p>
              <p className="text-2xl font-bold gradient-text font-heading mt-1">
                {data.resumo_diario.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          
          <div className="relative z-10">
             <p className="text-sm font-medium text-zinc-300 mb-3">Vendas por Pagamento</p>
             <div className="h-40 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={data.resumo_diario.vendas_pagamento}
                     cx="50%"
                     cy="50%"
                     innerRadius={40}
                     outerRadius={70}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {data.resumo_diario.vendas_pagamento.map((_: any, index: number) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <RechartsTooltip 
                     contentStyle={{ backgroundColor: '#121214cc', backdropFilter: 'blur(10px)', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                     itemStyle={{ color: '#fff' }}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 text-xs mt-2 text-zinc-400">
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Pix</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Cartão</span>
               <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Dinheiro</span>
             </div>
          </div>
        </div>

        {/* Resumo Semanal */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-brand-500/15 transition-all duration-500"></div>
          
          <h3 className="text-xl font-bold text-white font-heading border-b border-white/5 pb-2 mb-6 relative z-10">Faturamento Semanal</h3>
          <div className="h-80 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.vendas_semana} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <RechartsTooltip 
                  cursor={{fill: '#ffffff08'}}
                  contentStyle={{ backgroundColor: '#121214cc', backdropFilter: 'blur(10px)', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  // @ts-ignore
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Vendas']}
                />
                <Bar dataKey="vendas" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Produtos Mais Vendidos */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-rose-500/15 transition-all duration-500"></div>
          
           <h3 className="text-xl font-bold text-white font-heading border-b border-white/5 pb-2 mb-4 relative z-10">Produtos Mais Vendidos (Mês)</h3>
           <div className="space-y-3 relative z-10">
             {data.produtos_mes.length === 0 ? (
               <p className="text-zinc-500">Nenhum produto vendido no mês.</p>
             ) : (
               data.produtos_mes.map((p: any, i: number) => (
                 <div key={i} className="flex flex-col gap-1">
                   <div className="flex justify-between text-sm">
                     <span className="text-zinc-300">{p.nome}</span>
                     <span className="font-bold text-white">{p.qtd} un</span>
                   </div>
                   <div className="w-full bg-dark-900/50 rounded-full h-2 overflow-hidden border border-white/5">
                     <div className="bg-gradient-to-r from-brand-500 to-rose-500 h-2 rounded-full transition-all duration-500" style={{ width: `${p.pct}%` }}></div>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Métricas Mensais */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/15 transition-all duration-500"></div>
          
          <h3 className="text-xl font-bold text-white font-heading border-b border-white/5 pb-2 mb-4 relative z-10">Métricas Mensais</h3>
          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center p-3 bg-dark-900/50 rounded-xl border border-white/5 transition-all duration-300 hover:border-white/10">
              <span className="text-zinc-400">Total de Pedidos</span>
              <span className="text-xl font-bold text-white font-heading">{data.metricas_mes.total_pedidos}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-900/50 rounded-xl border border-white/5 transition-all duration-300 hover:border-white/10">
              <span className="text-zinc-400">Faturamento</span>
              <span className="text-xl font-bold gradient-text font-heading">
                {data.metricas_mes.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-dark-900/50 rounded-xl border border-white/5 transition-all duration-300 hover:border-white/10">
              <span className="text-zinc-400">Ticket Médio</span>
              <span className="text-xl font-bold text-blue-400 font-heading">
                {data.metricas_mes.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
