'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { Note, Template } from '../lib/types';
import { NoteWorkspace } from './components/NoteWorkspace';
import { ReviewSession } from './components/ReviewSession';

export default function HomePage() {
  const [view, setView] = useState<'notes' | 'review'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const showError = useCallback((message: string) => setError(message), []);

  useEffect(() => {
    Promise.all([api.listNotes(), api.listTemplates()])
      .then(([loadedNotes, loadedTemplates]) => { setNotes(loadedNotes); setTemplates(loadedTemplates); })
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'No se pudo cargar la aplicación.'))
      .finally(() => setLoading(false));
  }, []);

  return <div className="app-shell">
    <header className="topbar"><div><h1>Notas y repaso</h1><p>Escribe, enlaza y aprende a tu ritmo</p></div><nav className="nav-actions" aria-label="Secciones"><button className={`nav-button ${view === 'notes' ? 'active' : ''}`} onClick={() => setView('notes')}>Notas</button><button className={`nav-button ${view === 'review' ? 'active' : ''}`} onClick={() => setView('review')}>Repaso</button></nav></header>
    <main>
      {error && <div className="error" role="alert">{error} <button className="secondary-button" onClick={() => setError('')}>Cerrar</button></div>}
      {loading ? <p className="status">Cargando tus notas…</p> : view === 'notes' ? <NoteWorkspace notes={notes} templates={templates} onNotesChange={setNotes} onError={showError} /> : <ReviewSession onError={showError} />}
    </main>
  </div>;
}
