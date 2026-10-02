import { AlertCircle, CheckCircle2, Loader2, Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';

export const PrinterControl = () => {
  const {
    printerStatus,
    autoPrintEnabled,
    printerError,
    lastPrintedOrder,
    pendingPrintOrderId,
    connectPrinter,
    testPrinter,
    setAutoPrintEnabled,
    retryLastPrint,
  } = useAppData();
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const run = async (name: string, action: () => Promise<void>) => {
    setBusyAction(name);
    try {
      await action();
    } catch {
      // O contexto apresenta a mensagem específica da falha.
    } finally {
      setBusyAction(null);
    }
  };

  if (printerStatus.state === 'unsupported') {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-800">
        <AlertCircle size={16} /> Use Chrome ou Edge para imprimir
      </div>
    );
  }

  const connected = printerStatus.state === 'connected';
  const connecting = printerStatus.state === 'connecting' || busyAction === 'connect';

  return (
    <div className="relative flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
      <div className="flex items-center gap-2 px-1">
        {connecting ? (
          <Loader2 className="animate-spin text-orange-500" size={17} />
        ) : connected ? (
          <CheckCircle2 className="text-emerald-500" size={17} />
        ) : (
          <Printer className="text-slate-400" size={17} />
        )}
        <div className="leading-tight">
          <p className="text-xs font-bold text-slate-700">{connected ? 'Impressora pronta' : 'Impressora desconectada'}</p>
          {lastPrintedOrder && connected && <p className="text-[10px] text-slate-400">Última: #{lastPrintedOrder}</p>}
        </div>
      </div>

      {!connected ? (
        <button
          type="button"
          disabled={connecting}
          onClick={() => void run('connect', connectPrinter)}
          className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
        >
          {connecting ? 'Conectando...' : pendingPrintOrderId ? 'Conectar e imprimir' : 'Conectar'}
        </button>
      ) : (
        <>
          <button
            type="button"
            disabled={busyAction === 'test'}
            onClick={() => void run('test', testPrinter)}
            className="rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {busyAction === 'test' ? 'Imprimindo...' : 'Testar'}
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2" title="Imprimir automaticamente quando um pedido entrar">
            <input
              type="checkbox"
              checked={autoPrintEnabled}
              onChange={event => void run('auto', () => setAutoPrintEnabled(event.target.checked))}
              className="h-4 w-4 accent-orange-500"
            />
            <span className="text-xs font-bold text-slate-700">Automática</span>
          </label>
        </>
      )}

      {(printerError || pendingPrintOrderId) && (
        <div className="flex w-full items-center justify-between gap-2 border-t border-red-100 px-1 pt-1 text-[11px] text-red-600">
          <span className="min-w-0 leading-relaxed" title={printerError || undefined}>
            {pendingPrintOrderId
              ? `Há um pedido aguardando impressão. ${printerError || 'Conecte a impressora para imprimir.'}`
              : printerError}
          </span>
          {pendingPrintOrderId && connected && (
            <button
              type="button"
              disabled={!connected || busyAction === 'retry'}
              onClick={() => void run('retry', retryLastPrint)}
              className="flex shrink-0 items-center gap-1 font-bold hover:text-red-700 disabled:opacity-50"
            >
              <RefreshCw size={11} className={busyAction === 'retry' ? 'animate-spin' : ''} /> Reimprimir
            </button>
          )}
        </div>
      )}
    </div>
  );
};
