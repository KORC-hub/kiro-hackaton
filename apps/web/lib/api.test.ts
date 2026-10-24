import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => vi.restoreAllMocks());

describe('frontend API adapter', () => {
  it('sends the real render contract and returns srcdoc', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ srcdoc: '<!doctype html>' }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    await expect(api.render(1, { Front: 'Question' }, 'front')).resolves.toEqual({ srcdoc: '<!doctype html>' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/render', expect.objectContaining({ method: 'POST', body: JSON.stringify({ templateId: 1, fields: { Front: 'Question' }, side: 'front' }) }));
  });

  it('turns API errors into a Spanish-readable error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Title is required' }), { status: 422 }));
    await expect(api.createNote('', '')).rejects.toMatchObject({ message: 'Title is required', status: 422 });
  });
});
