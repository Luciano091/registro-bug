import { useState, useEffect } from 'react';
import { Wallet, DollarSign, ArrowDownCircle, ArrowUpCircle, Lock, LockOpen, History, Loader2, User } from 'lucide-react';
import api from '../services/api';
import { useAppData } from '../contexts/AppDataContext';

interface Movimentacao {
  id: number;
  tipo: string;
  valor: number;
  forma_pagamento: string;
  descricao: string;
  data: string;
}

interface Caixa {
  id: number;
  operador: string;
  saldo_inicial: number;
  saldo_final?: number;
  status: string;
  data_abertura: string;
  movimentacoes: Movimentacao[];
}

export default function CashFlow() {
  const [loading, setLoading] = useState(true);
  
  // Abrir Caixa State
  const [operador, setOperador] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("0");
  
  // Movimentacao State
  const [showMovModal, setShowMovModal] = useState(false);
  const [movTipo, setMovTipo] = useState<"sangria" | "suprimento">("sangria");
  const [movValor, setMovValor] = useState("");
  const [movDescricao, setMovDescricao] = useState("");

  const { caixa: cachedCaixa, caixaLoaded, refreshCaixa, setCaixaData } = useAppData();
  const caixa = cachedCaixa as Caixa | null;

  const fetchCaixa = async () => {
    if (!caixaLoaded) setLoading(true);
    await refreshCaixa();
    setLoading(false);
  };

  useEffect(() => {
    if (!caixaLoaded) {
      fetchCaixa();
    } else {
      // Sempre atualiza o caixa em segundo plano ao abrir a aba
      refreshCaixa();
      setLoading(false);
    }
  }, [caixaLoaded, refreshCaixa]);

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operador.trim()) return alert("Digite o nome do operador.");
    try {
      const res = await api.post('/caixa/abrir', {
        operador,
        saldo_inicial: parseFloat(saldoInicial) || 0
      });
      setCaixaData(res.data);
      fetchCaixa();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao abrir caixa");
    }
  };

  const handleFecharCaixa = async () => {
    if (!caixa) return;
    if (!window.confirm("Tem certeza que deseja fechar o caixa? Nenhuma nova venda poderá ser registrada até que seja aberto novamente.")) return;
    try {
      await api.post(`/caixa/${caixa.id}/fechar`);
      setCaixaData(null);
      fetchCaixa();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao fechar caixa");
    }
  };

  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixa) return;
    const valor = parseFloat(movValor);
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido");
    
    try {
      await api.post(`/caixa/${caixa.id}/movimento`, {
        tipo: movTipo,
        valor: valor,
        forma_pagamento: "Espécie",
        descricao: movDescricao
      });
      setShowMovModal(false);
      setMovValor("");
      setMovDescricao("");
      fetchCaixa();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao registrar movimentação");
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-brand-500 w-12 h-12" />
      </div>
    );
  }

  if (!caixa) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto h-full flex flex-col justify-center">
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(249,115,22,0.1)]">
          <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center mb-6">
            <Lock className="text-brand-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Caixa Fechado</h2>
          <p className="text-zinc-400 mb-8">Para iniciar as vendas do dia, é necessário abrir o caixa e informar o saldo de troco inicial.</p>
          
          <form onSubmit={handleAbrirCaixa} className="w-full flex flex-col gap-4 text-left">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Operador Responsável</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input 
                  type="text" 
                  value={operador}
                  onChange={(e) => setOperador(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder="Ex: João Silva"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Saldo Inicial (Troco em R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  value={saldoInicial}
                  onChange={(e) => setSaldoInicial(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  required
                />
              </div>
            </div>
            <button type="submit" className="premium-btn w-full py-4 rounded-xl font-bold text-lg mt-4 shadow-brand flex items-center justify-center gap-2">
              <LockOpen size={20} />
              Abrir Caixa
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totalEntradas = caixa.movimentacoes.filter(m => m.tipo === 'venda' || m.tipo === 'suprimento').reduce((acc, curr) => acc + curr.valor, 0);
  const totalSaidas = caixa.movimentacoes.filter(m => m.tipo === 'sangria').reduce((acc, curr) => acc + curr.valor, 0);
  const saldoAtual = caixa.saldo_inicial + totalEntradas - totalSaidas;

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold gradient-text">Gestão de Caixa</h1>
          <p className="text-zinc-400">Operador: <span className="text-white font-medium">{caixa.operador}</span> | Aberto em: {new Date(caixa.data_abertura).toLocaleString()}</p>
        </div>
        <button onClick={handleFecharCaixa} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 border border-red-500/20">
          <Lock size={18} /> Fechar Caixa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center">
          <span className="text-zinc-400 text-sm font-medium mb-1 flex items-center gap-2"><DollarSign size={16}/> Saldo Inicial</span>
          <span className="text-2xl font-bold text-white">R$ {caixa.saldo_inicial.toFixed(2)}</span>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center bg-green-500/5 border-green-500/20">
          <span className="text-emerald-400 text-sm font-medium mb-1 flex items-center gap-2"><ArrowUpCircle size={16}/> Entradas (Vendas + Sup)</span>
          <span className="text-2xl font-bold text-emerald-400">R$ {totalEntradas.toFixed(2)}</span>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center bg-red-500/5 border-red-500/20">
          <span className="text-red-400 text-sm font-medium mb-1 flex items-center gap-2"><ArrowDownCircle size={16}/> Saídas (Sangrias)</span>
          <span className="text-2xl font-bold text-red-400">R$ {totalSaidas.toFixed(2)}</span>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center bg-brand-500/5 border-brand-500/30">
          <span className="text-brand-400 text-sm font-medium mb-1 flex items-center gap-2"><Wallet size={16}/> Saldo Atual Projetado</span>
          <span className="text-3xl font-bold text-brand-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">R$ {saldoAtual.toFixed(2)}</span>
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => { setMovTipo("sangria"); setShowMovModal(true); }}
          className="flex-1 glass-card hover:bg-white/5 p-4 rounded-xl border border-red-500/30 text-red-400 font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowDownCircle size={20} /> Fazer Sangria (Retirada)
        </button>
        <button 
          onClick={() => { setMovTipo("suprimento"); setShowMovModal(true); }}
          className="flex-1 glass-card hover:bg-white/5 p-4 rounded-xl border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <ArrowUpCircle size={20} /> Fazer Suprimento (Entrada)
        </button>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <History className="text-brand-500" size={20} />
          <h2 className="font-bold text-lg text-white">Histórico de Movimentações</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-zinc-400 text-sm">
              <tr>
                <th className="p-4 font-medium">Data/Hora</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Descrição</th>
                <th className="p-4 font-medium">Forma Pagto</th>
                <th className="p-4 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {caixa.movimentacoes.slice().reverse().map((mov, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-zinc-300 text-sm">{new Date(mov.data).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mov.tipo === 'venda' ? 'bg-brand-500/20 text-brand-400' :
                      mov.tipo === 'suprimento' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {mov.tipo.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-zinc-300">{mov.descricao || "-"}</td>
                  <td className="p-4 text-zinc-400 text-sm">{mov.forma_pagamento}</td>
                  <td className={`p-4 text-right font-medium ${
                    mov.tipo === 'sangria' ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {mov.tipo === 'sangria' ? '-' : '+'} R$ {mov.valor.toFixed(2)}
                  </td>
                </tr>
              ))}
              {caixa.movimentacoes.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">Nenhuma movimentação registrada ainda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showMovModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl">
            <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${movTipo === 'sangria' ? 'text-red-400' : 'text-emerald-400'}`}>
              {movTipo === 'sangria' ? <ArrowDownCircle /> : <ArrowUpCircle />}
              {movTipo === 'sangria' ? 'Registrar Sangria' : 'Registrar Suprimento'}
            </h3>
            <form onSubmit={handleMovimentacao} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Valor (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                  <input 
                    type="number" 
                    min="0.01" step="0.01" required
                    value={movValor} onChange={e => setMovValor(e.target.value)}
                    className="w-full bg-dark-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Descrição / Motivo</label>
                <input 
                  type="text" required
                  value={movDescricao} onChange={e => setMovDescricao(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500 transition-colors"
                  placeholder={movTipo === 'sangria' ? "Ex: Pagamento fornecedor pão" : "Ex: Moedas para troco"}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowMovModal(false)} className="flex-1 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors font-medium">Cancelar</button>
                <button type="submit" className={`flex-1 p-3 rounded-xl font-bold text-white transition-colors shadow-lg ${movTipo === 'sangria' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}>
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
