import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '@app/core';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof DomainError) {
      const status = error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 422;
      response.status(status).json({ message: error.message, ...(error.details ? { details: error.details } : {}) });
      return;
    }
    if (error instanceof HttpException) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    response.status(500).json({ message: 'Internal server error' });
  }
}

export function parseObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DomainError('validation', `${label} must be an object`);
  return value as Record<string, unknown>;
}
