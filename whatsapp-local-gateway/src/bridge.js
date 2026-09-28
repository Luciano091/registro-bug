export class GatewayBridge {
  constructor(config, log) {
    this.baseUrl = config.backendUrl.replace(/\/$/, '');
    this.token = config.gatewayToken;
    this.slug = config.establishmentSlug;
    this.log = log;
    this.events = [];
    this.syncing = false;
    this.lastErrorAt = 0;
  }

  get enabled() {
    return Boolean(this.baseUrl && this.token && this.slug);
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'X-Gateway-Token': this.token,
    };
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.baseUrl}/whatsapp/gateway${path}`, {
      ...options,
      headers: { ...this.headers(), ...(options.headers || {}) },
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 180)}`);
    }
    return response.json();
  }

  reportError(error) {
    const now = Date.now();
    if (now - this.lastErrorAt > 60_000) {
      this.log(`Sincronização com o painel indisponível: ${error.message}`);
      this.lastErrorAt = now;
    }
  }

  enqueue(path, payload) {
    if (!this.enabled) return;
    this.events.push({ path, payload });
    if (this.events.length > 500) this.events.shift();
    void this.flushEvents();
  }

  async flushEvents() {
    if (!this.enabled || this.syncing) return;
    this.syncing = true;
    try {
      while (this.events.length) {
        const event = this.events[0];
        await this.request(event.path, {
          method: 'POST',
          body: JSON.stringify(event.payload),
        });
        this.events.shift();
      }
    } catch (error) {
      this.reportError(error);
    } finally {
      this.syncing = false;
    }
  }

  heartbeat(status) {
    if (!this.enabled) return;
    this.enqueue('/heartbeat', { slug: this.slug, ...status });
  }

  incoming(payload) {
    this.enqueue('/incoming', { slug: this.slug, ...payload });
  }

  outgoing(payload) {
    this.enqueue('/outgoing', { slug: this.slug, ...payload });
  }

  mode(chatId, mode, handoffRequested = false) {
    this.enqueue('/mode', {
      slug: this.slug,
      chat_id: chatId,
      modo: mode,
      handoff_requested: handoffRequested,
    });
  }

  async sync() {
    if (!this.enabled) return { outbox: [], modes: [] };
    try {
      await this.flushEvents();
      return await this.request(`/sync?slug=${encodeURIComponent(this.slug)}`);
    } catch (error) {
      this.reportError(error);
      return { outbox: [], modes: [] };
    }
  }

  async deliveryStatus(messageId, status, externalId = null, errorMessage = null) {
    if (!this.enabled) return;
    try {
      await this.request(`/outbox/${messageId}/status`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          external_id: externalId,
          error_message: errorMessage,
        }),
      });
    } catch (error) {
      this.reportError(error);
    }
  }
}
