import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, DollarSign, Package, Receipt, TrendingUp, TrendingDown, Download } from 'lucide-react';
import api from '../services/api';

const CAT_COLORS = ['#f97316', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

const GrowthBadge = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}% vs período anterior</span>
    </div>
  );
};

const Reports = () => {
  const [periodo, setPeriodo] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (periodo === 'custom' && (!customStart || !customEnd)) {
        return;
      }
      setIsLoading(true);
      try {
        setHasError(false);
        let url = `/dashboard/relatorios?periodo=${periodo}`;
        if (periodo === 'custom') {
          url += `&start=${customStart}&end=${customEnd}`;
        }
        const response = await api.get(url);
        setData(response.data);
      } catch (error) {
        console.error("Erro ao carregar relatórios:", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [periodo, customStart, customEnd]);

  const exportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] text-zinc-400 gap-4">
        <p className="text-lg">Ocorreu um erro ao buscar os dados do relatório.</p>
        <p className="text-sm">Por favor, verifique sua conexão ou tente novamente mais tarde.</p>
        <button onClick={() => setPeriodo(periodo === 'custom' ? 'mes' : periodo)} className="px-4 py-2 mt-4 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">Tentar Novamente</button>
      </div>
    );
  }

  // Calculate Pagamento max for progress bars
  const totalPagamentos = data.vendas_pagamento.reduce((acc: any, curr: any) => acc + curr.value, 0);

  return (
    <>
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 custom-scrollbar text-zinc-200 print:hidden">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white font-heading">Relatórios</h2>
          <p className="text-zinc-400 mt-1 text-sm">Acompanhe o desempenho completo do seu negócio.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {periodo === 'custom' && (
            <div className="flex items-center bg-dark-900/60 border border-white/5 rounded-lg p-1.5 backdrop-blur-md gap-2 px-3">
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)} 
                className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
              <span className="text-zinc-500 text-xs">até</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)} 
                className="bg-transparent text-sm text-zinc-300 outline-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}

          <div className="flex items-center bg-dark-900/60 border border-white/5 rounded-lg p-1 backdrop-blur-md">
             <Calendar size={16} className="text-zinc-400 ml-2 mr-1" />
             <select 
               value={periodo} 
               onChange={(e) => {
                 setPeriodo(e.target.value);
                 if (e.target.value === 'custom') {
                   const today = new Date();
                   const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                   setCustomStart(firstDay.toISOString().split('T')[0]);
                   setCustomEnd(today.toISOString().split('T')[0]);
                 }
               }}
               className="bg-transparent text-sm text-zinc-300 py-1.5 px-2 outline-none cursor-pointer"
             >
               <option value="hoje">Hoje</option>
               <option value="7d">Últimos 7 Dias</option>
               <option value="mes">Este Mês</option>
               <option value="custom">Personalizado</option>
             </select>
          </div>
          
          <button onClick={exportPDF} className="flex items-center gap-2 bg-dark-900/60 border border-white/5 hover:bg-white/5 transition-colors px-4 py-2 rounded-lg text-sm text-zinc-300 backdrop-blur-md">
            <Download size={16} />
            <span>Exportar</span>
          </button>
        </div>
      </header>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Faturamento Total</p>
            <h3 className="text-2xl font-bold text-white font-heading mb-1">
              {data.resumo.faturamento.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <GrowthBadge value={data.resumo.faturamento.crescimento} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Total de Pedidos</p>
            <h3 className="text-2xl font-bold text-white font-heading mb-1">{data.resumo.pedidos.atual}</h3>
            <GrowthBadge value={data.resumo.pedidos.crescimento} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-white font-heading mb-1">
              {data.resumo.ticket_medio.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <GrowthBadge value={data.resumo.ticket_medio.crescimento} />
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Lucro Líquido</p>
            <h3 className="text-2xl font-bold text-white font-heading mb-1">{data.resumo.lucro.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            <GrowthBadge value={data.resumo.lucro.crescimento} />
          </div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Faturamento Diário */}
        <div className="lg:col-span-1 glass-card p-5 rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white font-heading">Faturamento Diário</h3>
            <span className="text-xs text-zinc-500 bg-black/40 px-2 py-1 rounded border border-white/5">Por dia</span>
          </div>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.vendas_grafico} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff1a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#f97316' }}
                  formatter={(value: any, name: any) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name === 'vendas' ? 'Faturamento' : 'Lucro Líquido']}
                />
                <Area type="monotone" dataKey="vendas" stroke="#f97316" strokeWidth={2} fillOpacity={1} fill="url(#colorOrange)" activeDot={{ r: 4, fill: '#f97316', stroke: '#fff' }} dot={{ r: 2, fill: '#f97316', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorGreen)" activeDot={{ r: 4, fill: '#10b981', stroke: '#fff' }} dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendas por Categoria */}
        <div className="glass-card p-5 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-white font-heading mb-4">Vendas por Categoria</h3>
          <div className="flex-1 flex items-center justify-between">
            <div className="w-1/2 h-[180px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.vendas_categoria}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={2} dataKey="value" stroke="transparent"
                  >
                    {data.vendas_categoria.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CAT_COLORS[index % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} contentStyle={{ backgroundColor: '#18181b', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-xs text-white font-bold">{data.resumo.faturamento.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                 <span className="text-[10px] text-zinc-500">Total</span>
              </div>
            </div>
            
            <div className="w-1/2 flex flex-col gap-3 pl-2">
              {data.vendas_categoria.map((cat: any, idx: number) => (
                <div key={idx} className="flex justify-between items-start text-xs">
                  <div>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}></div>
                      {cat.name}
                    </div>
                    <div className="text-zinc-500 text-[10px] ml-3.5 mt-0.5">{cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  </div>
                  <div className="font-medium text-white">{data.resumo.faturamento.atual > 0 ? ((cat.value / data.resumo.faturamento.atual) * 100).toFixed(1) : 0}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Formas de Pagamento */}
        <div className="glass-card p-5 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-white font-heading mb-4">Formas de Pagamento</h3>
          <div className="flex-1 flex flex-col justify-center gap-4">
            {data.vendas_pagamento.map((pag: any, idx: number) => {
              const pct = totalPagamentos > 0 ? (pag.value / totalPagamentos) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-300">{pag.name}</span>
                    <div className="text-right">
                      <span className="text-white font-medium">{pct.toFixed(1)}%</span>
                      <span className="text-zinc-500 ml-2 text-[10px]">{pag.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                  </div>
                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Tables and Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Produtos Mais Vendidos */}
        <div className="glass-card p-5 rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
             <h3 className="text-sm font-bold text-white font-heading">Produtos Mais Vendidos</h3>
             <span className="text-xs text-zinc-500">Quantidade</span>
          </div>
          <div className="flex-1 flex flex-col gap-3">
             {data.produtos_top.length === 0 ? (
               <p className="text-xs text-zinc-500 text-center py-4">Nenhum dado</p>
             ) : (
               data.produtos_top.map((p: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between group cursor-default">
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-zinc-500 w-3">{idx + 1}</span>
                     <div className="w-8 h-8 rounded-full bg-dark-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                       <span className="text-lg">🍔</span>
                     </div>
                     <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1">{p.nome}</span>
                   </div>
                   <span className="text-xs text-zinc-400">{p.qtd} unidades</span>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Pedidos por Período (Heatmap) */}
        <div className="glass-card p-5 rounded-xl flex flex-col">
          <h3 className="text-sm font-bold text-white font-heading mb-4 border-b border-white/5 pb-3">Pedidos por Período</h3>
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <table className="w-full text-xs text-center border-separate border-spacing-1">
              <thead>
                <tr className="text-zinc-500">
                  <th className="font-normal text-left pb-2 w-1/4"></th>
                  <th className="font-normal pb-2">Seg</th>
                  <th className="font-normal pb-2">Ter</th>
                  <th className="font-normal pb-2">Qua</th>
                  <th className="font-normal pb-2">Qui</th>
                  <th className="font-normal pb-2">Sex</th>
                  <th className="font-normal pb-2">Sáb</th>
                  <th className="font-normal pb-2">Dom</th>
                  <th className="font-normal pb-2 text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.heatmap.map((row: any, rIdx: number) => {
                  const isTotal = row.turno === "Total";
                  return (
                    <tr key={rIdx} className={isTotal ? "font-bold text-white" : "text-zinc-300"}>
                      <td className={`text-left py-1.5 ${isTotal ? 'pt-4' : ''}`}>{row.turno}</td>
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom', 'Total'].map((col, cIdx) => {
                        const val = row[col];
                        const isColTotal = col === 'Total';
                        let bgColor = 'transparent';
                        if (!isTotal && !isColTotal && val > 0) {
                          // Opacity based on value (mocked simple scale)
                          const opacity = Math.min(0.2 + (val * 0.1), 1);
                          bgColor = `rgba(249, 115, 22, ${opacity})`;
                        }
                        
                        return (
                          <td 
                            key={cIdx} 
                            className={`py-1.5 ${(!isTotal && !isColTotal) ? 'rounded-sm' : ''} ${isColTotal ? 'text-white' : ''} ${isTotal ? 'pt-4' : ''}`}
                            style={{ backgroundColor: bgColor }}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    {/* DOCUMENTO OFICIAL PARA IMPRESSÃO (PDF) */}
    <div className="hidden print:block w-full bg-white text-black p-8 font-sans" style={{ color: '#000' }}>
      {/* Cabeçalho */}
      <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Burger Hause</h1>
          <h2 className="text-xl text-zinc-700 mt-1 font-medium">Relatório Oficial de Desempenho</h2>
        </div>
        <div className="text-right text-sm text-zinc-600">
          <p><strong>Período:</strong> {periodo === 'custom' ? `${customStart.split('-').reverse().join('/')} a ${customEnd.split('-').reverse().join('/')}` : periodo === 'hoje' ? 'Hoje' : periodo === '7d' ? 'Últimos 7 dias' : 'Mês atual'}</p>
          <p><strong>Emitido em:</strong> {new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Resumo Financeiro */}
      <div className="mb-10">
        <h3 className="text-lg font-bold border-b border-zinc-300 pb-2 mb-4 uppercase text-zinc-800">Resumo Financeiro</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-zinc-800">
              <th className="p-3 border border-zinc-300">Faturamento Total</th>
              <th className="p-3 border border-zinc-300">Lucro Líquido</th>
              <th className="p-3 border border-zinc-300">Total de Pedidos</th>
              <th className="p-3 border border-zinc-300">Ticket Médio</th>
              <th className="p-3 border border-zinc-300">Itens Vendidos</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-black">
              <td className="p-3 border border-zinc-300 font-bold text-lg">{data.resumo.faturamento.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="p-3 border border-zinc-300 font-bold text-lg text-emerald-600">{data.resumo.lucro.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="p-3 border border-zinc-300 font-bold text-lg">{data.resumo.pedidos.atual}</td>
              <td className="p-3 border border-zinc-300 font-bold text-lg">{data.resumo.ticket_medio.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td className="p-3 border border-zinc-300 font-bold text-lg">{data.resumo.itens_vendidos.atual}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tabelas Lado a Lado: Produtos e Pagamentos */}
      <div className="flex gap-8 mb-10">
        <div className="flex-1">
          <h3 className="text-lg font-bold border-b border-zinc-300 pb-2 mb-4 uppercase text-zinc-800">Top Produtos Vendidos</h3>
          <table className="w-full text-sm text-left border-collapse text-black">
            <thead>
              <tr className="bg-zinc-100 text-zinc-800">
                <th className="p-2 border border-zinc-300">#</th>
                <th className="p-2 border border-zinc-300">Produto</th>
                <th className="p-2 border border-zinc-300 text-right">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {data.produtos_top.slice(0, 10).map((p: any, idx: number) => (
                <tr key={idx}>
                  <td className="p-2 border border-zinc-300 text-center font-bold">{idx + 1}</td>
                  <td className="p-2 border border-zinc-300 font-medium">{p.nome}</td>
                  <td className="p-2 border border-zinc-300 text-right">{p.qtd}</td>
                </tr>
              ))}
              {data.produtos_top.length === 0 && (
                <tr><td colSpan={3} className="p-2 border border-zinc-300 text-center">Nenhum produto no período</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold border-b border-zinc-300 pb-2 mb-4 uppercase text-zinc-800">Formas de Pagamento</h3>
          <table className="w-full text-sm text-left border-collapse text-black">
            <thead>
              <tr className="bg-zinc-100 text-zinc-800">
                <th className="p-2 border border-zinc-300">Método</th>
                <th className="p-2 border border-zinc-300 text-right">Valor</th>
                <th className="p-2 border border-zinc-300 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {data.vendas_pagamento.map((p: any, idx: number) => {
                 const pct = totalPagamentos > 0 ? (p.value / totalPagamentos) * 100 : 0;
                 return (
                  <tr key={idx}>
                    <td className="p-2 border border-zinc-300 font-medium">{p.name}</td>
                    <td className="p-2 border border-zinc-300 text-right font-medium">{p.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="p-2 border border-zinc-300 text-right">{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Heatmap/Turnos em Tabela */}
      <div className="mb-10">
        <h3 className="text-lg font-bold border-b border-zinc-300 pb-2 mb-4 uppercase text-zinc-800">Fluxo de Pedidos por Turno (Heatmap)</h3>
        <table className="w-full text-sm text-center border-collapse text-black">
          <thead>
            <tr className="bg-zinc-100 text-zinc-800">
              <th className="p-2 border border-zinc-300 text-left">Turno</th>
              <th className="p-2 border border-zinc-300">Seg</th>
              <th className="p-2 border border-zinc-300">Ter</th>
              <th className="p-2 border border-zinc-300">Qua</th>
              <th className="p-2 border border-zinc-300">Qui</th>
              <th className="p-2 border border-zinc-300">Sex</th>
              <th className="p-2 border border-zinc-300">Sáb</th>
              <th className="p-2 border border-zinc-300">Dom</th>
              <th className="p-2 border border-zinc-300 bg-zinc-200">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.heatmap.map((row: any, idx: number) => {
              const isTotal = row.turno === "Total";
              return (
                <tr key={idx} className={isTotal ? "font-bold bg-zinc-100" : ""}>
                  <td className="p-2 border border-zinc-300 text-left font-medium">{row.turno}</td>
                  <td className="p-2 border border-zinc-300">{row.Seg}</td>
                  <td className="p-2 border border-zinc-300">{row.Ter}</td>
                  <td className="p-2 border border-zinc-300">{row.Qua}</td>
                  <td className="p-2 border border-zinc-300">{row.Qui}</td>
                  <td className="p-2 border border-zinc-300">{row.Sex}</td>
                  <td className="p-2 border border-zinc-300">{row.Sáb}</td>
                  <td className="p-2 border border-zinc-300">{row.Dom}</td>
                  <td className={`p-2 border border-zinc-300 ${isTotal ? 'bg-zinc-200 font-bold' : 'bg-zinc-50 font-medium'}`}>{row.Total}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Assinatura */}
      <div className="mt-20 pt-8 flex justify-between px-10">
        <div className="w-64 text-center border-t border-black pt-2">
          <p className="text-sm font-bold text-black">Gerência</p>
          <p className="text-xs text-zinc-600 mt-1">Assinatura</p>
        </div>
        <div className="w-64 text-center border-t border-black pt-2">
          <p className="text-sm font-bold text-black">Conferência</p>
          <p className="text-xs text-zinc-600 mt-1">Data: ___/___/20___</p>
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-zinc-200 text-center text-[10px] text-zinc-400">
        Gerado pelo sistema Burger Hause. Documento de uso interno, confidencial.
      </div>
    </div>
    </>
  );
};

export default Reports;
