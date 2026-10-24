'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Card, ReviewRating } from '../../lib/types';

interface ReviewSessionProps {
  onError: (message: string) => void;
}

export function ReviewSession({ onError }: ReviewSessionProps) {
  const [queue, setQueue] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [srcDoc, setSrcDoc] = useState('');
  const [rendering, setRendering] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const card = queue[0];

  useEffect(() => {
    api.reviewQueue()
      .then(setQueue)
      .catch((error: unknown) => onError(error instanceof ApiError ? error.message : 'No se pudo cargar la sesión.'))
      .finally(() => setLoading(false));
  }, [onError]);

  useEffect(() => {
    if (!card) return;
    setRevealed(false);
    setRendering(true);
    api.render(card.templateId, card.fields, 'front')
      .then((result) => setSrcDoc(result.srcdoc))
      .catch((error: unknown) => onError(error instanceof ApiError ? error.message : 'No se pudo mostrar la tarjeta.'))
      .finally(() => setRendering(false));
  }, [card, onError]);

  async function reveal() {
    if (!card) return;
    setRendering(true);
    try {
      const result = await api.render(card.templateId, card.fields, 'back');
      setSrcDoc(result.srcdoc);
      setRevealed(true);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo mostrar el reverso.');
    } finally {
      setRendering(false);
    }
  }

  async function review(rating: ReviewRating) {
    if (!card) return;
    setReviewing(true);
    try {
      await api.reviewCard(card.id, rating);
      setQueue((current) => current.slice(1));
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo guardar el repaso.');
    } finally {
      setReviewing(false);
    }
  }

  if (loading) return <section className="review-layout"><p className="status">Cargando tarjetas pendientes…</p></section>;
  if (!card) return <section className="review-layout panel empty"><h2>Repaso terminado</h2><p>No tienes tarjetas pendientes ahora.</p></section>;

  return <section className="review-layout">
    <div className="review-header"><div><h2>Sesión de repaso</h2><p className="muted">Tarjeta {queue.length} pendiente{queue.length === 1 ? '' : 's'}</p></div></div>
    <article className="review-card">
      {rendering && <p className="status">Cargando tarjeta…</p>}
      <iframe className="review-frame" title={revealed ? 'Reverso de la tarjeta' : 'Frontal de la tarjeta'} sandbox="" srcDoc={srcDoc} />
      {!revealed ? <button className="primary-button" onClick={reveal} disabled={rendering}>Revelar reverso</button> : <div className="review-actions">{(['again', 'hard', 'good', 'easy'] as ReviewRating[]).map((rating) => <button key={rating} className={`rating-button ${rating}`} onClick={() => review(rating)} disabled={reviewing}>{rating === 'again' ? 'Again' : rating === 'hard' ? 'Hard' : rating === 'good' ? 'Good' : 'Easy'}</button>)}</div>}
    </article>
  </section>;
}
