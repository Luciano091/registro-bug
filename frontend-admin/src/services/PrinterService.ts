export type PrinterConnectionState = 'unsupported' | 'disconnected' | 'connecting' | 'connected' | 'error';
export type PrintDriver = 'system' | 'serial';

export type PrinterStatus = {
  state: PrinterConnectionState;
  message?: string;
};

type StatusListener = (status: PrinterStatus) => void;

const AUTO_PRINT_KEY = 'ritmesa:auto_print_enabled';
const PRINT_DRIVER_KEY = 'ritmesa:print_driver';

const friendlyPrinterError = (error: any) => {
  const rawMessage = String(error?.message || error || '');
  if (/failed to open serial port|cannot open|open.*serial/i.test(rawMessage)) {
    return 'Não foi possível abrir a impressora. Confirme se ela está ligada e conectada via cabo USB ou Bluetooth.';
  }
  if (/device has been lost|disconnected|networkerror/i.test(rawMessage)) {
    return 'A impressora foi desconectada. Ligue-a e conecte novamente.';
  }
  if (/already open|already locked|locked/i.test(rawMessage)) {
    return 'A impressora já está sendo usada por outra aba ou aplicativo. Feche-o e tente novamente.';
  }
  return rawMessage || 'Não foi possível conectar à impressora.';
};

const USB_BRIDGE_URL = 'http://127.0.0.1:9123';

export class PrinterService {
  private static port: any | null = null;
  private static writer: any | null = null;
  private static status: PrinterStatus = {
    state: 'disconnected',
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

  static isUsbDriver(): boolean {
    const driver = this.getDriver();
    return driver === 'system' || (driver as string) === 'usb';
  }

  static getDriver(): PrintDriver {
    const saved = localStorage.getItem(PRINT_DRIVER_KEY);
    if (!saved) {
      return 'system';
    }
    return saved as PrintDriver;
  }

  static setDriver(driver: PrintDriver) {
    localStorage.setItem(PRINT_DRIVER_KEY, driver);
    if (this.isUsbDriver()) {
      void this.connect({ requestPermission: false }).catch(() => {});
    } else {
      if (!this.port) {
        this.setStatus({
          state: typeof navigator !== 'undefined' && 'serial' in navigator ? 'disconnected' : 'unsupported',
          message: 'Ligue e conecte a impressora Bluetooth'
        });
      }
    }
  }

  static isSupported() {
    return true;
  }

  static getStatus(): PrinterStatus {
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
    if (this.isUsbDriver()) {
      this.setStatus({ state: 'connecting', message: 'Verificando cabo USB...' });
      try {
        const res = await fetch(`${USB_BRIDGE_URL}/`, { signal: AbortSignal.timeout(2500) });
        const data = await res.json();
        if (data.status === 'online') {
          this.setStatus({ state: 'connected', message: 'Pronta (Cabo USB)' });
          return true;
        }
        throw new Error('Impressora USB não detectada.');
      } catch (err: any) {
        const message = 'Conecte o cabo USB da impressora ao computador.';
        this.setStatus({ state: 'error', message });
        throw new Error(message);
      }
    }

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
      let portToUse = null;

      // Se options.requestPermission for true (o usuário clicou em "Conectar"),
      // tentamos reusar a porta existente SOMENTE se ela abrir com sucesso.
      // Se falhar ou não houver porta, chamamos requestPort() para abrir a janelinha do navegador!
      if (ports.length > 0 && !options.requestPermission) {
        for (const p of ports) {
          try {
            if (!p.readable && !p.writable) await p.open({ baudRate: 9600 });
            if (p.writable) {
              portToUse = p;
              break;
            }
          } catch {
            // Porta antiga desconectada, tenta a próxima
          }
        }
      }

      if (options.requestPermission) {
        // Tenta a porta existente primeiro
        if (ports[0]) {
          try {
            if (!ports[0].readable && !ports[0].writable) await ports[0].open({ baudRate: 9600 });
            if (ports[0].writable) {
              portToUse = ports[0];
            }
          } catch {
            // Se a porta antiga falhou ao abrir, descartamos para abrir a janela de seleção
            portToUse = null;
          }
        }

        // Se não conseguiu abrir a porta antiga ou não há portas salvas,
        // abre a janela nativa do Chrome para o usuário selecionar a impressora!
        if (!portToUse) {
          portToUse = await (navigator as any).serial.requestPort();
          if (!portToUse.readable && !portToUse.writable) {
            await portToUse.open({ baudRate: 9600 });
          }
        }
      }

      if (!portToUse || !portToUse.writable) {
        throw new Error('Nenhuma impressora selecionada. Clique em "Conectar" e escolha a impressora.');
      }

      this.port = portToUse;
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

  static printViaSystem(text: string): Promise<void> {
    return new Promise((resolve) => {
      const cleanText = this.removeAccents(text)
        .replace(/\x1B!\x38/g, '<strong>')
        .replace(/\x1B!\x00/g, '</strong>');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.bottom = '0';
      iframe.style.right = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        resolve();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Comanda</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            @media print {
              html, body {
                width: 58mm;
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.25;
              color: #000;
              margin: 0;
              padding: 3mm 2mm;
              white-space: pre-wrap;
              word-break: break-word;
            }
            strong {
              font-size: 14px;
              font-weight: 900;
              display: inline-block;
            }
          </style>
        </head>
        <body>${cleanText}</body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error('Erro na impressao do sistema:', e);
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch {}
          resolve();
        }, 1500);
      }, 300);
    });
  }

  static async printReceipt(text: string, options: { requestPermission?: boolean } = {}) {
    if (this.isUsbDriver()) {
      try {
        const res = await fetch(`${USB_BRIDGE_URL}/print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(6000),
        });
        const data = await res.json();
        if (data.success) {
          this.setStatus({ state: 'connected', message: 'Pronta (Cabo USB)' });
          return;
        }
        throw new Error(data.error || 'Erro ao enviar para o cabo USB.');
      } catch (err: any) {
        this.setStatus({ state: 'error', message: 'Erro na impressão USB' });
        throw new Error(err?.message || 'Falha ao imprimir via cabo USB.');
      }
    }
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
