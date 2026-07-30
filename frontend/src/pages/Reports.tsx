import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Printer, Package, DollarSign, Receipt } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

const Reports = () => {
  const [periodo, setPeriodo] = useState('mes');
  const [data, setData] = useState({
    resumo: { pedidos: 0, faturamento: 0, ticket_medio: 0, vendas_pagamento: [] as any[] },
    vendas_grafico: [] as any[],
    produtos_top: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/dashboard/relatorios?periodo=${periodo}`);
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [periodo]);

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 custom-scrollbar">
      
      {/* Header & Filters */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Relatórios Gerenciais</h2>
          <p className="text-zinc-400 mt-1">Análise detalhada de vendas e produtos.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto bg-dark-900/40 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setPeriodo('hoje')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === 'hoje' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            Hoje
          </button>
          <button 
            onClick={() => setPeriodo('7d')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === '7d' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            7 Dias
          </button>
          <button 
            onClick={() => setPeriodo('mes')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === 'mes' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
          >
            Este Mês
          </button>
          
          <button onClick={exportPDF} className="hidden md:flex ml-2 p-2 rounded-lg text-brand-400 hover:bg-brand-500/10 transition-colors" title="Imprimir Relatório">
            <Printer size={18} />
          </button>
        </div>
      </header>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between group">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Total Faturado</p>
            <h3 className="text-3xl font-bold gradient-text font-heading group-hover:scale-105 transition-transform origin-left">
              {data.resumo.faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between group">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Pedidos Realizados</p>
            <h3 className="text-3xl font-bold text-white font-heading group-hover:text-brand-400 transition-colors">
              {data.resumo.pedidos}
            </h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center border border-brand-500/20 group-hover:bg-brand-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(249,115,22,0.15)]">
            <Package size={24} />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between group">
          <div>
            <p className="text-sm font-medium text-zinc-400 mb-1">Ticket Médio</p>
            <h3 className="text-3xl font-bold text-blue-400 font-heading group-hover:text-blue-300 transition-colors">
              {data.resumo.ticket_medio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Receipt size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Curva de Faturamento */}
        <div className="xl:col-span-2 glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-brand-500/20"></div>
          
          <h3 className="text-xl font-bold text-white font-heading mb-6 relative z-10 flex items-center justify-between">
            <span>Evolução do Faturamento</span>
            <span className="text-xs font-normal text-zinc-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">{periodo.toUpperCase()}</span>
          </h3>
          
          <div className="h-80 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.vendas_grafico} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 10, 5, 0.8)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f97316', fontWeight: 'bold' }}
                  // @ts-ignore
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Faturamento']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorFaturamento)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Divisão de Pagamentos */}
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group flex flex-col">
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transition-all duration-500 group-hover:bg-emerald-500/20"></div>
          
          <h3 className="text-xl font-bold text-white font-heading mb-2 relative z-10">Formas de Pagamento</h3>
          <p className="text-sm text-zinc-400 mb-6 relative z-10">Distribuição da receita no período</p>
          
          <div className="flex-1 min-h-[250px] relative z-10">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data.resumo.vendas_pagamento}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={90}
                   paddingAngle={8}
                   dataKey="value"
                   stroke="rgba(255,255,255,0.05)"
                 >
                   {data.resumo.vendas_pagamento.map((_: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <RechartsTooltip 
                   contentStyle={{ backgroundColor: 'rgba(15, 10, 5, 0.8)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                   itemStyle={{ color: '#fff' }}
                   // @ts-ignore
                   formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                 />
               </PieChart>
             </ResponsiveContainer>
             
             {/* Totals overlay in center of pie chart */}
             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs text-zinc-500">Receita</span>
                <span className="text-lg font-bold text-white font-heading">
                   {data.resumo.vendas_pagamento.reduce((acc, curr) => acc + curr.value, 0) > 0 ? '100%' : '0%'}
                </span>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 relative z-10">
             {data.resumo.vendas_pagamento.map((metodo, idx) => (
                <div key={idx} className="bg-black/30 p-2 rounded-lg border border-white/5 text-center">
                   <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length], boxShadow: `0 0 8px ${COLORS[idx % COLORS.length]}80` }}></div>
                      {metodo.name}
                   </div>
                   <div className="font-semibold text-white text-sm truncate" title={metodo.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}>
                      {metodo.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Tabela de Produtos Mais Vendidos */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
        <h3 className="text-xl font-bold text-white font-heading mb-6 relative z-10">Top 10 Produtos Mais Vendidos</h3>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                <th className="pb-4 pl-4 font-heading">Ranking</th>
                <th className="pb-4 font-heading">Produto</th>
                <th className="pb-4 text-center font-heading">Quantidade</th>
                <th className="pb-4 text-right pr-4 font-heading">Receita Gerada</th>
              </tr>
            </thead>
            <tbody>
              {data.produtos_top.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">Nenhum produto vendido neste período.</td>
                </tr>
              ) : (
                data.produtos_top.map((produto: any, index: number) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                    <td className="py-4 pl-4 w-24">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-gradient-to-br from-brand-400 to-rose-500 text-white shadow-lg shadow-brand-500/20' : 'bg-white/10 text-zinc-400'}`}>
                        #{index + 1}
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-medium text-zinc-200 group-hover/row:text-white transition-colors">{produto.nome}</span>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-medium min-w-[60px]">
                        {produto.qtd} un
                      </span>
                    </td>
                    <td className="py-4 text-right pr-4">
                      <span className="font-bold text-emerald-400 font-heading">
                        {produto.receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default Reports;
