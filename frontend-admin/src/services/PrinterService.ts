export type PrinterConnectionState = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error';

export type PrinterStatus = {
  state: PrinterConnectionState;
  message?: string;
};

type StatusListener = (status: PrinterStatus) => void;

const AUTO_PRINT_KEY = 'ritmesa:auto_print_enabled';

const friendlyPrinterError = (error: any) => {
  const rawMessage = String(error?.message || error || '');
  if (/failed to open serial port|cannot open|open.*serial/i.test(rawMessage)) {
    return 'Não foi possível abrir a impressora. Confirme se ela está ligada e conectada ao Bluetooth.';
  }
  if (/device has been lost|disconnected|networkerror/i.test(rawMessage)) {
    return 'A impressora foi desconectada. Ligue-a e conecte novamente.';
  }
  if (/already open|already locked|locked/i.test(rawMessage)) {
    return 'A impressora já está sendo usada por outra aba ou aplicativo. Feche-o e tente novamente.';
  }
  return rawMessage || 'Não foi possível conectar à impressora.';
};

export class PrinterService {
  private static port: any | null = null;
  private static writer: any | null = null;
  private static status: PrinterStatus = {
    state: typeof navigator !== 'undefined' && 'serial' in navigator ? 'disconnected' : 'unsupported',
  };
  private static listeners = new Set<StatusListener>();
  private static printQueue: Promise<void> = Promise.resolve();
  private static disconnectListenerRegistered = false;

  private static setStatus(status: PrinterStatus) {
    this.status = status;
    this.listeners.forEach(listener => listener(status));
  }

  private static registerDisconnectListener() {
    if (this.disconnectListenerRegistered || !('serial' in navigator)) return;
    (navigator as any).serial.addEventListener('disconnect', (event: any) => {
      if (this.port && event.target !== this.port) return;
      this.writer = null;
      this.port = null;
      this.setStatus({ state: 'disconnected', message: 'Impressora desconectada.' });
    });
    this.disconnectListenerRegistered = true;
  }

  static isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  static getStatus() {
    return this.status;
  }

  static subscribe(listener: StatusListener) {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  static getAutoPrintEnabled() {
    return localStorage.getItem(AUTO_PRINT_KEY) === 'true';
  }

  static setAutoPrintEnabled(enabled: boolean) {
    localStorage.setItem(AUTO_PRINT_KEY, String(enabled));
  }

  static async connect(options: { requestPermission?: boolean } = {}) {
    if (!this.isSupported()) {
      const message = 'Seu navegador não suporta impressão direta. Use Chrome ou Edge.';
      this.setStatus({ state: 'unsupported', message });
      throw new Error(message);
    }

    if (this.port && this.writer) {
      this.setStatus({ state: 'connected' });
      return true;
    }

    this.setStatus({ state: 'connecting' });
    this.registerDisconnectListener();

    try {
      const ports = await (navigator as any).serial.getPorts();
      this.port = ports[0] || null;
      if (!this.port && options.requestPermission) {
        this.port = await (navigator as any).serial.requestPort();
      }
      if (!this.port) throw new Error('Clique em "Conectar impressora" e selecione a MO-5812.');

      if (!this.port.readable && !this.port.writable) await this.port.open({ baudRate: 9600 });
      if (!this.port.writable) throw new Error('A porta da impressora não está disponível para escrita.');
      this.writer = this.port.writable.getWriter();
      this.setStatus({ state: 'connected' });
      return true;
    } catch (error: any) {
      this.port = null;
      this.writer = null;
      const message = error?.name === 'NotFoundError'
        ? 'Nenhuma impressora foi selecionada.'
        : friendlyPrinterError(error);
      this.setStatus({ state: 'error', message });
      throw new Error(message);
    }
  }

  static async disconnect() {
    try {
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.port) await this.port.close();
    } finally {
      this.port = null;
      this.setStatus({ state: 'disconnected' });
    }
  }

  static removeAccents(str: string) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private static async writeReceipt(text: string, requestPermission: boolean) {
    if (!this.port || !this.writer) await this.connect({ requestPermission });
    if (!this.writer) throw new Error("A conexão com a impressora falhou.");

    const ESC = '\x1B';
    const init = ESC + '@';
    const setCharset = ESC + 't' + '\x00';
    const cleanText = this.removeAccents(text);
    const data = new TextEncoder().encode(init + setCharset + cleanText + '\n\n\n');

    try {
      await this.writer.write(data);
      this.setStatus({ state: 'connected' });
    } catch (error: any) {
      try {
        this.writer?.releaseLock();
      } catch {
        // A porta pode ter sido removida fisicamente.
      }
      this.writer = null;
      this.port = null;
      const message = friendlyPrinterError(error) || 'Falha ao enviar a comanda para a impressora.';
      this.setStatus({ state: 'error', message });
      throw new Error(message);
    }
  }

  static async printReceipt(text: string, options: { requestPermission?: boolean } = {}) {
    const operation = this.printQueue.then(() => this.writeReceipt(text, options.requestPermission !== false));
    this.printQueue = operation.catch(() => undefined);
    return operation;
  }

  static async printTest() {
    const separator = '-'.repeat(32);
    await this.printReceipt([
      separator,
      '       BISBURGER / RITMESA',
      separator,
      '',
      'IMPRESSORA CONECTADA',
      'Teste realizado com sucesso.',
      '',
      new Date().toLocaleString('pt-BR'),
      separator,
    ].join('\n'));
  }
}
