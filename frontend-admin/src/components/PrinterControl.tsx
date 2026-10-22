import { AlertCircle, CheckCircle2, Loader2, Printer, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAppData } from '../contexts/AppDataContext';

export const PrinterControl = () => {
  const {
    printerStatus,
    printDriver,
    setPrintDriver,
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
      <div className="flex h-12 w-[350px] max-w-full items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-800">
        <AlertCircle size={16} /> Use Chrome ou Edge para imprimir
      </div>
    );
  }

  const connected = printerStatus.state === 'connected';
  const connecting = printerStatus.state === 'connecting' || busyAction === 'connect';
  const statusDetail = pendingPrintOrderId
    ? '1 pedido pendente'
    : printerError
      ? printerError
      : connected
        ? lastPrintedOrder ? `Última impressão: #${lastPrintedOrder}` : printDriver === 'system' ? 'Pronta (Atomo_Cabo_USB)' : autoPrintEnabled ? 'Impressão automática ativada' : 'Impressão automática desativada'
        : 'Ligue a impressora para conectar';

  return (
    <div className={`relative flex h-12 w-[420px] max-w-full flex-nowrap items-center gap-2 overflow-hidden rounded-xl border bg-white px-2.5 py-1.5 shadow-sm ${pendingPrintOrderId || printerError ? 'border-red-200' : 'border-slate-200'}`} title={printerError || (connecting ? 'Conectando impressora' : connected ? 'Impressora conectada' : 'Impressora desconectada')}>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        {connecting ? (
          <Loader2 className="shrink-0 animate-spin text-orange-500" size={17} />
        ) : connected ? (
          <CheckCircle2 className="shrink-0 text-emerald-500" size={17} />
        ) : (
          <Printer className="shrink-0 text-slate-400" size={17} />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-bold text-slate-700">{connecting ? 'Conectando...' : connected ? 'Conectada' : 'Impressora offline'}</p>
            <select
              value={printDriver}
              onChange={e => setPrintDriver(e.target.value as any)}
              className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded px-1 py-0.5 outline-none cursor-pointer"
              title="Tipo de conexão da impressora"
            >
              <option value="system">USB (Cabo)</option>
              <option value="serial">Bluetooth</option>
            </select>
          </div>
          <p className={`mt-0.5 truncate text-[10px] ${pendingPrintOrderId || printerError ? 'text-red-600' : 'text-slate-400'}`}>{statusDetail}</p>
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
          {pendingPrintOrderId ? (
            <button
              type="button"
              disabled={busyAction === 'retry'}
              onClick={() => void run('retry', retryLastPrint)}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
            >
              <RefreshCw size={12} className={busyAction === 'retry' ? 'animate-spin' : ''} /> Reimprimir
            </button>
          ) : (
            <button
              type="button"
              disabled={busyAction === 'test'}
              onClick={() => void run('test', testPrinter)}
              className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {busyAction === 'test' ? 'Imprimindo...' : 'Testar'}
            </button>
          )}
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
    </div>
  );
};
