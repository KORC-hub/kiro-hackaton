import type { Backlink, Card, Note, ReviewRating, Template } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
  } catch {
    throw new ApiError('No se pudo conectar con la API. Comprueba que esté encendida.', 0);
  }

  if (!response.ok) {
    let message = 'La API devolvió un error.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Keep the generic message when the response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  listNotes: () => request<Note[]>('/notes'),
  createNote: (title: string, content: string) => request<Note>('/notes', json({ title, content })),
  updateNote: (id: number, content: string) => request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify({ content }), headers: { 'Content-Type': 'application/json' } }),
  backlinks: (id: number) => request<Backlink[]>(`/notes/${id}/backlinks`),
  listTemplates: () => request<Template[]>('/templates'),
  render: (templateId: number, fields: Record<string, string>, side: 'front' | 'back') => request<{ srcdoc: string }>('/render', json({ templateId, fields, side })),
  createCard: (templateId: number, fields: Record<string, string>, sourceNoteId: number) => request<Card>('/cards', json({ templateId, fields, sourceNoteId })),
  reviewQueue: () => request<Card[]>('/review/queue'),
  reviewCard: (cardId: number, rating: ReviewRating) => request<Card>(`/review/${cardId}`, json({ rating })),
};
