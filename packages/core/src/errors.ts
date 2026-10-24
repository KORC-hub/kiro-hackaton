export class DomainError extends Error {
  constructor(public readonly code: 'validation' | 'conflict' | 'not_found', message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'DomainError';
  }
}
