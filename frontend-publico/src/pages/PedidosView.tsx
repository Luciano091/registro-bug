import { useState, useEffect } from 'react';
import { Receipt, Clock, CheckCircle2, ChefHat, Bike } from 'lucide-react';
import api from '../services/api';

export const PedidosView = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const idsStr = localStorage.getItem('meus_pedidos');
        if (!idsStr) {
          setLoading(false);
          return;
        }
        
        const ids = JSON.parse(idsStr);
        if (!Array.isArray(ids) || ids.length === 0) {
          setLoading(false);
          return;
        }

        // Buscar todos os pedidos
        const promessas = ids.map((id: number) => api.get(`/pedidos/${id}`).catch(() => null));
        const resultados = await Promise.all(promessas);
        
        // Filtrar nulos e ordenar do mais novo para o mais antigo
        const pedidosValidos = resultados
          .filter(r => r && r.data)
          .map(r => r!.data)
          .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
          
        setPedidos(pedidosValidos);
      } catch (error) {
        console.error("Erro ao buscar pedidos", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPedidos();
  }, []);

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'Novo': return { icon: <Clock size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Aguardando Confirmação' };
      case 'Em preparo': return { icon: <ChefHat size={20} />, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Em Preparo na Cozinha' };
      case 'Pronto': return { icon: <CheckCircle2 size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Pronto para Retirada' };
      case 'Saiu entrega': return { icon: <Bike size={20} />, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Saiu para Entrega' };
      case 'Finalizado': return { icon: <CheckCircle2 size={20} />, color: 'text-zinc-500', bg: 'bg-zinc-100', label: 'Pedido Entregue' };
      default: return { icon: <Clock size={20} />, color: 'text-zinc-500', bg: 'bg-zinc-100', label: status };
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div></div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center min-h-[60vh]">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <Receipt size={32} className="text-zinc-400" />
        </div>
        <h2 className="text-xl font-heading font-bold text-zinc-900 mb-2">Nenhum Pedido</h2>
        <p className="text-zinc-500 text-sm">
          Você ainda não fez nenhum pedido conosco. Que tal explorar nosso cardápio e matar essa fome?
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-heading font-bold text-zinc-900 mb-6 px-2">Meus Pedidos</h2>
      
      {pedidos.map(pedido => {
        const info = getStatusInfo(pedido.status);
        const date = new Date(pedido.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        
        return (
          <div key={pedido.id} className="bg-white border border-zinc-200 rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pedido #{pedido.numero.split('-').pop() || pedido.numero}</span>
                <p className="text-sm text-zinc-600 mt-1">{date}</p>
              </div>
              <div className="text-right">
                <span className="font-price font-bold text-lg text-zinc-900">
                  {parseFloat(pedido.total).toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </span>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 p-3 rounded-xl ${info.bg} ${info.color}`}>
              {info.icon}
              <span className="font-bold text-sm">{info.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
