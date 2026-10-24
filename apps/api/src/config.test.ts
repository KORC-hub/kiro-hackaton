import { describe, expect, it } from 'vitest';
import { getHost, getPort, getWebOrigin } from './config';

describe('API runtime configuration', () => {
  it('uses loopback, API port 3000, and local web origin by default', () => {
    expect(getHost({})).toBe('127.0.0.1');
    expect(getPort({})).toBe(3000);
    expect(getWebOrigin({})).toBe('http://localhost:3001');
  });

  it('honors explicit runtime configuration', () => {
    const environment = { HOST: '0.0.0.0', PORT: '4100', WEB_ORIGIN: 'https://demo.example' };
    expect(getHost(environment)).toBe('0.0.0.0');
    expect(getPort(environment)).toBe(4100);
    expect(getWebOrigin(environment)).toBe('https://demo.example');
  });
});
