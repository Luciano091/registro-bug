import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Award, BarChart3, Calendar, DollarSign, Package, Receipt, TrendingUp, TrendingDown, Download, FileSpreadsheet, Users } from 'lucide-react';
import api from '../services/api';
import { DateRangePicker } from '../components/DateRangePicker';

const parseLocalDate = (dateString: string) => {
  if (!dateString) return null;
  const [y, m, d] = dateString.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CAT_COLORS = ['#f97316', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

const GrowthBadge = ({ value }: { value: number }) => {
  const isPositive = value >= 0;
  return (
    <div className={`flex items-center gap-1 text-[11px] font-semibold whitespace-nowrap ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      <span>{isPositive ? '+' : ''}{value.toFixed(1)}% vs. anterior</span>
    </div>
  );
};

const Reports = () => {
  const [periodo, setPeriodo] = useState('mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const exportCSV = () => {
    if (!data || !data.pedidos_raw) return;
    
    // Headers
    const headers = ["ID", "Cliente", "Data", "Total (R$)", "Forma de Pagamento", "Tipo Entrega", "Status"];
    
    // Rows
    const rows = data.pedidos_raw.map((p: any) => [
      p.id,
      `"${(p.cliente || '').replace(/"/g, '""')}"`,
      p.data,
      p.total.toFixed(2).replace('.', ','),
      p.forma_pagamento,
      p.tipo_entrega,
      p.status
    ]);
    
    const csvContent = [headers.join(';'), ...rows.map((r: any[]) => r.join(';'))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio_pedidos_${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [exportingClients, setExportingClients] = useState(false);
  const exportClientsCSV = async () => {
    setExportingClients(true);
    try {
      const response = await api.get('/clientes/exportar');
      const clientes = response.data;
      if (!clientes || clientes.length === 0) {
        alert("Nenhum cliente com telefone encontrado na sua base.");
        return;
      }
      
      const headers = ["Cliente", "Telefone", "Ultima Compra", "Dias Ausente", "Qtd. Pedidos", "Total Gasto (R$)"];
      const rows = clientes.map((c: any) => [
        `"${(c.nome || '').replace(/"/g, '""')}"`,
        c.telefone,
        c.ultima_compra,
        c.dias_ausente,
        c.total_pedidos,
        c.total_gasto.toFixed(2).replace('.', ',')
      ]);
      
      const csvContent = [headers.join(';'), ...rows.map((r: any[]) => r.join(';'))].join('\n');
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `clientes_campanha.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error(error);
      alert("Erro ao exportar base de clientes.");
    } finally {
      setExportingClients(false);
    }
  };

  const totalPagamentos = data?.vendas_pagamento?.reduce((acc: any, curr: any) => acc + curr.value, 0) || 0;
  const faturamentoAtual = Number(data?.resumo?.faturamento?.atual || 0);
  const lucroAtual = Number(data?.resumo?.lucro?.atual || 0);
  const totalPedidosAtual = Number(data?.resumo?.pedidos?.atual || 0);
  const itensVendidos = Number(data?.resumo?.itens_vendidos?.atual || 0);
  const margemEstimada = faturamentoAtual > 0 ? (lucroAtual / faturamentoAtual) * 100 : 0;
  const itensPorPedido = totalPedidosAtual > 0 ? itensVendidos / totalPedidosAtual : 0;

  const changePeriod = (nextPeriod: string) => {
    setPeriodo(nextPeriod);
    if (nextPeriod === 'custom') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustomStart(formatLocalDate(firstDay));
      setCustomEnd(formatLocalDate(today));
      setShowDatePicker(true);
      return;
    }
    setShowDatePicker(false);
  };

  return (
    <>
    <div className="p-4 md:p-7 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 custom-scrollbar text-zinc-200 print:hidden">
      
      <header className="reports-header flex flex-col gap-4 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
              <BarChart3 size={23} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-none tracking-tight text-zinc-900 font-heading">Relatórios</h2>
              <p className="mt-1.5 text-xs text-zinc-500">Fluxo, vendas e saúde da operação em uma única visão.</p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto" aria-label="Exportar relatórios">
            <span className="mr-1 hidden text-[10px] font-bold uppercase tracking-widest text-zinc-400 xl:inline">Exportar</span>
            <button onClick={exportClientsCSV} disabled={exportingClients} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 sm:flex-none" title="Exportar base de clientes">
              <Users size={15} /> {exportingClients ? 'Gerando...' : 'Clientes CSV'}
            </button>
            <button onClick={exportCSV} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-bold text-zinc-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 sm:flex-none" title="Exportar vendas para planilha">
              <FileSpreadsheet size={15} /> Vendas CSV
            </button>
            <button onClick={exportPDF} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-zinc-800 sm:flex-none" title="Baixar relatório em PDF">
              <Download size={15} /> PDF
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Período</span>
            <div className="grid grid-cols-4 rounded-lg bg-zinc-100 p-1 sm:flex" role="group" aria-label="Filtrar período">
              {[
                ['hoje', 'Hoje'],
                ['7d', '7 dias'],
                ['mes', 'Este mês'],
                ['custom', 'Personalizado'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => changePeriod(value)}
                  aria-pressed={periodo === value}
                  className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${periodo === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {periodo === 'custom' && (
              <div className="relative">
                <button onClick={() => setShowDatePicker(!showDatePicker)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 sm:w-auto">
                  <Calendar size={15} />
                  {customStart ? customStart.split('-').reverse().join('/') : 'Início'} a {customEnd ? customEnd.split('-').reverse().join('/') : 'Fim'}
                </button>
                {showDatePicker && (
                  <div className="absolute left-0 top-full z-50 mt-2 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                    <DateRangePicker
                      startDate={parseLocalDate(customStart)}
                      endDate={parseLocalDate(customEnd)}
                      onChange={(start, end) => {
                        setCustomStart(start ? formatLocalDate(start) : '');
                        setCustomEnd(end ? formatLocalDate(end) : '');
                      }}
                    />
                    <button onClick={() => setShowDatePicker(false)} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700">Aplicar período</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="px-1 text-[11px] text-zinc-400">Os percentuais comparam automaticamente com o período anterior.</p>
        </div>
      </header>

      {/* Conteúdo Dinâmico */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : hasError || !data ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 gap-4">
          <p className="text-lg">Ocorreu um erro ao buscar os dados do relatório.</p>
          <button onClick={() => setPeriodo(periodo === 'custom' ? 'mes' : periodo)} className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-semibold">Tentar Novamente</button>
        </div>
      ) : (
        <>

      {/* Row 1: KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card flex min-h-[112px] items-start gap-3.5 rounded-xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign size={21} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Faturamento</p>
            <h3 className="mb-1 text-2xl font-bold text-white font-heading tabular-nums">
              {data.resumo.faturamento.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <GrowthBadge value={data.resumo.faturamento.crescimento} />
          </div>
        </div>

        <div className="glass-card flex min-h-[112px] items-start gap-3.5 rounded-xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Package size={21} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Pedidos</p>
            <h3 className="mb-1 text-2xl font-bold text-white font-heading tabular-nums">{data.resumo.pedidos.atual}</h3>
            <GrowthBadge value={data.resumo.pedidos.crescimento} />
          </div>
        </div>

        <div className="glass-card flex min-h-[112px] items-start gap-3.5 rounded-xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Receipt size={21} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ticket médio</p>
            <h3 className="mb-1 text-2xl font-bold text-white font-heading tabular-nums">
              {data.resumo.ticket_medio.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
            <GrowthBadge value={data.resumo.ticket_medio.crescimento} />
          </div>
        </div>

        <div className="glass-card flex min-h-[112px] items-start gap-3.5 rounded-xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <TrendingUp size={21} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lucro estimado</p>
            <h3 className="mb-1 text-2xl font-bold text-white font-heading tabular-nums">{data.resumo.lucro.atual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            <GrowthBadge value={data.resumo.lucro.crescimento} />
          </div>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Activity size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Margem estimada</p><strong className="text-base text-slate-800">{margemEstimada.toFixed(1)}%</strong></div>
        </div>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Receipt size={18} /></div>
          <div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Itens por pedido</p><strong className="text-base text-slate-800">{itensPorPedido.toFixed(1)}</strong><span className="ml-1 text-xs text-slate-400">({itensVendidos} itens)</span></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600"><Award size={18} /></div>
          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Produto líder</p><strong className="block truncate text-base text-slate-800">{data.produtos_top?.[0]?.nome || 'Sem vendas no período'}</strong></div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Faturamento Diário */}
        <div className="lg:col-span-1 glass-card p-5 rounded-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-white font-heading">Faturamento Diário</h3>
            <span className="text-xs text-zinc-400 bg-black/40 px-2 py-1 rounded border border-white/5">Por dia</span>
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
                  formatter={(value: any, name: any) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), name === 'vendas' ? 'Faturamento' : 'Lucro estimado']}
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
            <div className="relative h-[180px] w-[42%] shrink-0">
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
                 <span className="text-[10px] text-zinc-400">Total</span>
              </div>
            </div>
            
            <div className="flex w-[58%] min-w-0 flex-col gap-3 pl-3">
              {data.vendas_categoria.map((cat: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-200" title={cat.name}>
                      <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: CAT_COLORS[idx % CAT_COLORS.length] }}></div>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="text-zinc-400 text-[10px] ml-3.5 mt-0.5">{cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                  </div>
                  <div className="shrink-0 font-medium text-white">{data.resumo.faturamento.atual > 0 ? ((cat.value / data.resumo.faturamento.atual) * 100).toFixed(1) : 0}%</div>
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
                    <span className="text-zinc-200">{pag.name}</span>
                    <div className="text-right">
                      <span className="text-white font-medium">{pct.toFixed(1)}%</span>
                      <span className="text-zinc-400 ml-2 text-[10px]">{pag.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
             <span className="text-xs text-zinc-400">Quantidade</span>
          </div>
          <div className="flex-1 flex flex-col gap-3">
             {data.produtos_top.length === 0 ? (
               <p className="text-xs text-zinc-400 text-center py-4">Nenhum dado</p>
             ) : (
               data.produtos_top.map((p: any, idx: number) => (
                 <div key={idx} className="flex items-center justify-between group cursor-default">
                   <div className="flex items-center gap-3">
                     <span className="text-xs font-bold text-zinc-400 w-3">{idx + 1}</span>
                     <div className="w-8 h-8 rounded-full bg-dark-900 border border-white/5 flex items-center justify-center overflow-hidden shrink-0">
                       <span className="text-lg">🍔</span>
                     </div>
                     <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors line-clamp-1">{p.nome}</span>
                   </div>
                   <span className="text-xs text-zinc-300">{p.qtd} unidades</span>
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
                <tr className="text-zinc-400">
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
                    <tr key={rIdx} className={isTotal ? "font-bold text-white" : "text-zinc-200"}>
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
      </>
      )}
    </div>

    {/* DOCUMENTO OFICIAL PARA IMPRESSÃO (PDF) */}
    {!isLoading && !hasError && data && (
    <div className="hidden print:block w-full bg-white text-black p-8 font-sans" style={{ color: '#000' }}>
      {/* Cabeçalho */}
      <div className="border-b-2 border-black pb-4 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Relatório Gerencial</h1>
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
              <th className="p-3 border border-zinc-300">Lucro Estimado</th>
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

      <div className="mt-12 pt-4 border-t border-zinc-200 text-center text-[10px] text-zinc-300">
        Gerado pelo Ritmesa. Documento de uso interno e confidencial.
      </div>
    </div>
    )}
    </>
  );
};

export default Reports;
