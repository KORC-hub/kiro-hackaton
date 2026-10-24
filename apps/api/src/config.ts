export function getHost(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.HOST || '127.0.0.1';
}

export function getPort(environment: NodeJS.ProcessEnv = process.env): number {
  const port = Number(environment.PORT || 3000);
  return Number.isInteger(port) && port > 0 ? port : 3000;
}

export function getWebOrigin(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.WEB_ORIGIN || 'http://localhost:3001';
}
