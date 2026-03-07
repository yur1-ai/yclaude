import { describe, expect, it } from 'vitest';
import { createApp } from '../server.js';
import type { AppState } from '../server.js';

describe('createApp', () => {
  it('returns a Hono instance given empty state', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    expect(app).toBeDefined();
    expect(typeof app.request).toBe('function');
  });

  it('GET /api/v1/summary returns 200', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    expect(res.status).toBe(200);
  });

  it('GET /api/v1/summary has Content-Type application/json', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('all responses include Content-Security-Policy header', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    expect(res.headers.get('content-security-policy')).toBeTruthy();
  });

  it('CSP header includes "default-src \'none\'"', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("default-src 'none'");
  });

  it('CSP header includes "connect-src \'self\'"', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("connect-src 'self'");
  });

  it('CSP header does NOT contain any external domain', async () => {
    const state: AppState = { events: [], providers: [] };
    const app = createApp(state);
    const res = await app.request('/api/v1/summary');
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).not.toMatch(/https?:\/\//);
  });
});
