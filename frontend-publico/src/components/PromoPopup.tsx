import { useState, useEffect } from 'react';
import { TicketPercent, X } from 'lucide-react';
import { getEstablishmentSlug } from '../services/api';
import api from '../services/api';
import { saveCouponCode } from '../services/couponStorage';

export const PromoPopup = () => {
  const [cupom, setCupom] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCupom = async () => {
      try {
        const { data } = await api.get(`/public/${getEstablishmentSlug()}/cupons/destaque`);
        if (data) {
          const seenKey = `promo_popup_seen:${getEstablishmentSlug()}:${data.codigo}`;
          if (sessionStorage.getItem(seenKey)) return;
          setCupom(data);
          // Pequeno atraso para dar tempo da tela carregar antes de mostrar o popup
          setTimeout(() => setShow(true), 1200);
        }
      } catch (e) {
        // Sem cupons em destaque ou erro
      } finally {
        setLoading(false);
      }
    };
    
    fetchCupom();
  }, []);

  if (loading || !show || !cupom) return null;

  const dismiss = () => {
    sessionStorage.setItem(`promo_popup_seen:${getEstablishmentSlug()}:${cupom.codigo}`, 'true');
    setShow(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] animate-in fade-in duration-300" onClick={dismiss} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-[101] animate-in zoom-in-95 fade-in duration-300">
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {/* Decoração de fundo inspirada no iFood */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-[100px] -z-10" />
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-brand-50 rounded-full -z-10" />
          
          <button 
            onClick={dismiss}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center text-center mt-2">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center rotate-[-10deg] shadow-inner mb-4 relative">
              <TicketPercent size={40} />
              {/* Confetes simplificados */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-purple-400 rounded-full -translate-x-2 -translate-y-2" />
              <div className="absolute top-4 right-0 w-2 h-2 bg-yellow-400 rounded-full translate-x-4 -translate-y-2" />
              <div className="absolute bottom-2 left-2 w-2 h-2 bg-brand-400 rounded-full -translate-x-3 translate-y-3" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 font-heading mb-2">Ganhe cupons!</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              Pegue seu cupom e aproveite <strong className="text-slate-800">{cupom.tipo === 'percentual' ? `${cupom.valor}%` : `R$ ${cupom.valor.toFixed(2)}`} de desconto</strong>{cupom.descricao ? ` em ${cupom.descricao}` : ''}.
            </p>
            
            <button 
              onClick={() => {
                saveCouponCode(cupom.codigo);
                sessionStorage.setItem(`promo_popup_seen:${getEstablishmentSlug()}:${cupom.codigo}`, 'true');
                alert(`Cupom ${cupom.codigo} resgatado com sucesso!\nEle será aplicado automaticamente no final da sua compra.`);
                setShow(false);
              }}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-lg py-3.5 rounded-2xl transition-colors shadow-lg shadow-red-600/20"
            >
              Pegar cupom
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
