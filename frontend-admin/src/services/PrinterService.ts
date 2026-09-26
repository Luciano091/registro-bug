export class PrinterService {
  private static port: any | null = null;
  private static writer: any | null = null;

  static async connect() {
    if (!('serial' in navigator)) {
      throw new Error("Seu navegador não suporta a Web Serial API (use Chrome ou Edge).");
    }

    try {
      // Tenta reconectar a uma porta já aprovada
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length > 0) {
        this.port = ports[0];
      } else {
        // Pede permissão se não tiver nenhuma
        this.port = await (navigator as any).serial.requestPort();
      }

      if (!this.port) throw new Error("Nenhuma impressora selecionada.");

      await this.port.open({ baudRate: 9600 });
      this.writer = this.port.writable.getWriter();
      return true;
    } catch (e: any) {
      this.port = null;
      this.writer = null;
      throw new Error("Erro ao conectar à impressora: " + (e.message || "Desconhecido"));
    }
  }

  static async disconnect() {
    if (this.writer) {
      await this.writer.releaseLock();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
  }

  static removeAccents(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  static async printReceipt(text: string) {
    if (!this.port || !this.writer) {
      await this.connect();
    }
    
    if (!this.writer) throw new Error("A conexão com a impressora falhou.");

    const ESC = '\x1B';
    const init = ESC + '@'; // Initialize printer
    const setCharset = ESC + 't' + '\x00'; // PC437
    
    const cleanText = this.removeAccents(text);
    
    const encoder = new TextEncoder();
    // A MO-5812 usa serrilha manual. Tres avancos deixam espaco suficiente
    // para destacar o cupom sem desperdicarem uma faixa grande de papel.
    const data = encoder.encode(init + setCharset + cleanText + '\n\n\n');
    
    await this.writer.write(data);
  }
}
