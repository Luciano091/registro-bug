import { useState, useEffect } from 'react';
import { Search, Clock, CheckCircle2, Truck, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAppData } from '../contexts/AppDataContext';

const statusColors: any = {
  'Recebido': 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)] backdrop-blur-md',
  'Em preparo': 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)] backdrop-blur-md',
  'Pronto': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] backdrop-blur-md',
  'Saiu entrega': 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)] backdrop-blur-md',
  'Finalizado': 'bg-white/5 text-zinc-400 border-white/10 backdrop-blur-md',
};

const statusIcons: any = {
  'Recebido': <Clock size={16} />,
  'Em preparo': <Loader2 size={16} className="animate-spin" />,
  'Pronto': <CheckCircle2 size={16} />,
  'Saiu entrega': <Truck size={16} />,
  'Finalizado': <CheckCircle2 size={16} />,
};

const Orders = () => {
  const [filter, setFilter] = useState('Hoje');
  const [search, setSearch] = useState('');
  const { orders: cachedOrders, ordersLoaded, refreshOrders, updateOrderStatus: optimisticUpdateStatus } = useAppData();
  const orders = cachedOrders;

  useEffect(() => {
    if (!ordersLoaded) refreshOrders();
    const interval = setInterval(refreshOrders, 10000);
    return () => clearInterval(interval);
  }, [ordersLoaded, refreshOrders]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.put(`/pedidos/${id}/status?status=${newStatus}`);
      optimisticUpdateStatus(id, newStatus);
      refreshOrders();
    } catch (error) {
      console.error(error);
      alert("Erro ao alterar status");
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.cliente.toLowerCase().includes(search.toLowerCase()) || 
                          order.numero.includes(search);
    if (!matchesSearch) return false;

    if (filter === 'Todos') return true;

    if (!order.data) return true; // Fallback if no date

    const orderDate = new Date(order.data);
    const today = new Date();
    
    if (filter === 'Hoje') {
      return orderDate.toDateString() === today.toDateString();
    }
    if (filter === 'Ontem') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return orderDate.toDateString() === yesterday.toDateString();
    }
    if (filter === 'Semana') {
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      return orderDate >= lastWeek;
    }
    if (filter === 'Mês') {
      return orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear();
    }
    
    if (filter.includes('-')) {
      const [year, month] = filter.split('-');
      return orderDate.getFullYear() === parseInt(year) && orderDate.getMonth() + 1 === parseInt(month);
    }

    return true;
  });

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-white font-heading drop-shadow-sm">Pedidos</h2>
        <p className="text-zinc-400 mt-1">Gerencie e acompanhe os pedidos em andamento.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="flex items-center gap-2 p-1 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl overflow-x-auto custom-scrollbar shadow-lg">
          {['Hoje', 'Ontem', 'Semana', 'Mês', 'Todos'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm transition-all whitespace-nowrap ${filter === f ? 'bg-white/10 text-white font-medium shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
            >
              {f}
            </button>
          ))}
          <div className="h-6 w-px bg-white/10 mx-1 shrink-0"></div>
          <input 
            type="month"
            value={filter.includes('-') ? filter : ''}
            onChange={(e) => setFilter(e.target.value || 'Mês')}
            className={`bg-dark-900/50 border border-white/10 text-sm rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-brand-500/50 transition-all ${filter.includes('-') ? 'text-brand-400 border-brand-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'text-zinc-400'}`}
            title="Selecionar um mês específico"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou nº..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-72 bg-dark-800/50 backdrop-blur-md border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/50 transition-all shadow-lg"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden min-h-[400px]">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pedido</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Entrega</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-500/70 text-sm font-bold">#</span>
                        <span className="font-bold text-white text-lg">{order.numero.split('-')[1] || order.numero}</span>
                      </div>
                      <span className="text-xs text-zinc-500 mt-1 block">Há pouco tempo</span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{order.cliente}</div>
                      {order.telefone && (
                        <div className="text-xs text-zinc-500 mt-0.5">{order.telefone}</div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      {order.tipo_entrega === 'Retirada' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20">
                          Retirada no Local
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium text-brand-400 bg-brand-500/10 mb-1">
                            Delivery
                          </span>
                          <p className="text-xs text-zinc-400 whitespace-normal break-words">
                            {order.endereco || 'Endereço não informado'}
                          </p>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-brand-400">
                        R$ {order.total.toFixed(2)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center gap-1.5 w-max ${statusColors[order.status] || statusColors['Recebido']}`}>
                          {statusIcons[order.status] || statusIcons['Recebido']}
                          <span className="hidden sm:inline">{order.status}</span>
                        </div>
                        
                        {/* Invisible by default, shows on hover to change status quickly */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <select 
                            className="bg-dark-900 border border-white/10 hover:border-brand-500/50 text-zinc-300 text-xs rounded-md px-2 py-1 outline-none cursor-pointer"
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          >
                            {Object.keys(statusColors).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
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

export default Orders;
