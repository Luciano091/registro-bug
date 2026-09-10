import { useState, useEffect } from 'react';
import { Receipt, Clock, CheckCircle2, ChefHat, Bike, MapPin, Navigation } from 'lucide-react';
import api from '../services/api';
import { getEstablishmentSlug } from '../services/api';

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
        
        const codigos = JSON.parse(idsStr);
        if (!Array.isArray(codigos) || codigos.length === 0) {
          setLoading(false);
          return;
        }

        // Buscar todos os pedidos
        const promessas = codigos
          .filter((codigo: unknown) => typeof codigo === 'string')
          .map((codigo: string) => api.get(`/public/${getEstablishmentSlug()}/acompanhamento/${encodeURIComponent(codigo)}`).catch(() => null));
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
    const interval = window.setInterval(fetchPedidos, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'Novo':
      case 'Recebido': return { icon: <Clock size={20} />, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Pedido recebido' };
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
        const stages = ['Recebido', 'Em preparo', 'Pronto', ...(pedido.tipo_entrega === 'Delivery' || pedido.tipo_entrega === 'Entrega' ? ['Saiu entrega'] : [])];
        
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
            {pedido.entrega?.entregador && <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600"><Bike size={20}/></div><div className="min-w-0 flex-1"><span className="block text-xs font-semibold text-zinc-500">Entregador responsável</span><strong className="block truncate text-zinc-900">{pedido.entrega.entregador.nome}</strong><span className="text-xs text-zinc-500">{pedido.entrega.entregador.veiculo||'Veículo'}{pedido.entrega.entregador.placa?` · ${pedido.entrega.entregador.placa}`:''}</span></div></div>{pedido.entrega.status==='em_rota'&&pedido.entrega.latitude!=null&&pedido.entrega.longitude!=null&&<a href={`https://www.google.com/maps/search/?api=1&query=${pedido.entrega.latitude},${pedido.entrega.longitude}`} target="_blank" rel="noreferrer" className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white"><Navigation size={18}/>Ver localização no mapa</a>}{pedido.entrega.status==='em_rota'&&<p className="mt-2 flex items-center justify-center gap-1 text-xs text-zinc-500"><MapPin size={13}/>{pedido.entrega.localizacao_atualizada_em?'Localização atualizada recentemente':'Aguardando sinal de localização'}</p>}</div>}
            <div className="mt-4 grid gap-1" style={{gridTemplateColumns:`repeat(${stages.length},minmax(0,1fr))`}} aria-label="Etapas do pedido">{stages.map((step,index)=>{const ranks:Record<string,number>={'Novo':0,'Recebido':0,'Em preparo':1,'Pronto':2,'Saiu entrega':3,'Finalizado':4};const active=(ranks[pedido.status]??0)>=index;return <div key={step} className="text-center"><div className={`mx-auto h-2 rounded-full ${active?'bg-orange-500':'bg-zinc-200'}`}/><span className={`mt-1 block text-[9px] font-semibold ${active?'text-zinc-700':'text-zinc-400'}`}>{step==='Saiu entrega'?'Em rota':step}</span></div>})}</div>
          </div>
        );
      })}
    </div>
  );
};
