import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardHtml } from '../src/dashboard.js';

test('painel contém controles e JavaScript válido', () => {
  assert.match(dashboardHtml, /QR Code do WhatsApp/);
  assert.match(dashboardHtml, /Pausar robô/);

  const script = dashboardHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'script do painel não encontrado');
  assert.doesNotThrow(() => new Function(script));
});

