import { useState, type FormEvent } from 'react';
import { TicketPercent } from 'lucide-react';
import api, { getEstablishmentSlug } from '../services/api';
import { clearSavedCouponCode, getSavedCouponCode, saveCouponCode } from '../services/couponStorage';

type CupomConsultado = {
  codigo: string;
  descricao?: string | null;
  pedido_minimo: number;
  tipo: 'percentual' | 'fixo';
  valor: number;
};

export const CuponsView = () => {
  const [codigo, setCodigo] = useState(getSavedCouponCode);
  const [consultando, setConsultando] = useState(false);
  const [cupom, setCupom] = useState<CupomConsultado | null>(null);
  const [erro, setErro] = useState('');

  const consultar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const codigoNormalizado = codigo.trim().toUpperCase();
    if (codigoNormalizado.length < 2 || consultando) return;
    setConsultando(true);
    setErro('');
    setCupom(null);
    try {
      const { data } = await api.post<CupomConsultado>(`/public/${getEstablishmentSlug()}/cupons/consultar`, { codigo: codigoNormalizado });
      setCodigo(data.codigo);
      setCupom(data);
      saveCouponCode(data.codigo);
    } catch (error: any) {
      if (getSavedCouponCode() === codigoNormalizado) clearSavedCouponCode();
      setErro(error.response?.data?.detail || 'Não foi possível verificar o cupom agora. Tente novamente.');
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center px-5 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-brand-500"><TicketPercent size={30} /></div>
      <h1 className="font-heading text-xl font-bold text-zinc-900">Meus cupons</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">Recebeu um código? Verifique-o aqui e aplique o desconto no carrinho.</p>

      <form onSubmit={consultar} className="mt-7 w-full space-y-3 text-left">
        <label htmlFor="codigo-cupom" className="block text-sm font-semibold text-zinc-700">Código do cupom</label>
        <input id="codigo-cupom" type="text" maxLength={40} autoCapitalize="characters" spellCheck={false} value={codigo} onChange={event => { const next = event.target.value.toUpperCase(); if (getSavedCouponCode() && getSavedCouponCode() !== next.trim()) clearSavedCouponCode(); setCodigo(next); setCupom(null); setErro(''); }} placeholder="Digite o código" className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold uppercase text-zinc-900 outline-none focus:border-brand-500" />
        <button type="submit" disabled={consultando || codigo.trim().length < 2} className="min-h-12 w-full rounded-xl bg-brand-500 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-600 disabled:opacity-50">{consultando ? 'Verificando...' : 'Verificar e guardar'}</button>
      </form>

      {cupom && <div role="status" className="mt-5 w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-900">
        <strong className="block">Cupom {cupom.codigo} válido</strong>
        <p className="mt-1">{cupom.descricao || (cupom.tipo === 'percentual' ? `${cupom.valor}% de desconto` : `${cupom.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de desconto`)}</p>
        {cupom.pedido_minimo > 0 && <p className="mt-1">Pedido mínimo: {cupom.pedido_minimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.</p>}
        <p className="mt-2 text-xs text-emerald-800">O valor final será confirmado no carrinho.</p>
      </div>}
      {erro && <p role="alert" className="mt-5 w-full rounded-xl bg-red-50 p-4 text-left text-sm text-red-700">{erro}</p>}
    </div>
  );
};
