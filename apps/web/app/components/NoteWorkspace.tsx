'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Backlink, Note, Template } from '../../lib/types';
import { MarkdownPreview } from './MarkdownPreview';
import { CardCreator } from './CardCreator';

interface NoteWorkspaceProps {
  notes: Note[];
  templates: Template[];
  onNotesChange: (notes: Note[]) => void;
  onError: (message: string) => void;
}

export function NoteWorkspace({ notes, templates, onNotesChange, onError }: NoteWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<number | null>(notes[0]?.id ?? null);
  const [title, setTitle] = useState(notes[0]?.title ?? '');
  const [content, setContent] = useState(notes[0]?.content ?? '');
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [loadingBacklinks, setLoadingBacklinks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCardCreator, setShowCardCreator] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const selectedNote = notes.find((note) => note.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedNote) {
      setSelectedId(notes[0]?.id ?? null);
      return;
    }
    setTitle(selectedNote.title);
    setContent(selectedNote.content);
    setLoadingBacklinks(true);
    api.backlinks(selectedNote.id)
      .then(setBacklinks)
      .catch((error: unknown) => onError(error instanceof ApiError ? error.message : 'No se pudieron cargar los backlinks.'))
      .finally(() => setLoadingBacklinks(false));
  }, [selectedId, notes, selectedNote, onError]);

  function selectNote(note: Note) {
    setSelectedId(note.id);
    setSelectedText('');
  }

  async function saveNote() {
    if (!selectedNote || !title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateNote(selectedNote.id, content);
      onNotesChange(notes.map((note) => note.id === updated.id ? updated : note));
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo guardar la nota.');
    } finally {
      setSaving(false);
    }
  }

  async function createNote() {
    const noteTitle = window.prompt('Título de la nueva nota:');
    if (!noteTitle?.trim()) return;
    try {
      const note = await api.createNote(noteTitle.trim(), '');
      onNotesChange([...notes, note]);
      setSelectedId(note.id);
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo crear la nota.');
    }
  }

  function trackSelection() {
    const textarea = document.querySelector<HTMLTextAreaElement>('#note-content');
    setSelectedText(textarea?.value.slice(textarea.selectionStart, textarea.selectionEnd) ?? '');
  }

  if (!notes.length) {
    return <section className="panel empty"><p>Aún no hay notas.</p><button className="primary-button" onClick={createNote}>Crear primera nota</button></section>;
  }

  return (
    <div className="workspace-grid">
      <aside className="note-list">
        <div className="note-list-header"><h2>Mis notas</h2><button className="secondary-button" onClick={createNote}>Nueva</button></div>
        <div className="note-items">
          {notes.map((note) => <button className={`note-item ${note.id === selectedId ? 'selected' : ''}`} key={note.id} onClick={() => selectNote(note)}><strong>{note.title}</strong><small>{note.content.slice(0, 50) || 'Sin contenido'}</small></button>)}
        </div>
      </aside>

      <section className="panel editor" aria-label="Editor de nota">
        <div className="editor-header"><h2>{selectedNote?.title}</h2><button className="primary-button" onClick={() => setShowCardCreator(true)} disabled={!selectedText || !templates.length}>Crear tarjeta con selección</button></div>
        <label htmlFor="note-content" className="muted">Contenido Markdown</label>
        <textarea id="note-content" className="note-textarea" value={content} onChange={(event) => setContent(event.target.value)} onSelect={trackSelection} placeholder="Escribe tu nota aquí... Puedes enlazar con [[Otra nota]]." />
        <div className="editor-actions"><span className="muted">{selectedText ? `Texto seleccionado: ${selectedText.length} caracteres` : 'Selecciona texto para crear una tarjeta'}</span><button className="primary-button" onClick={saveNote} disabled={saving}>{saving ? 'Guardando…' : 'Guardar nota'}</button></div>
        <div><h3>Vista previa</h3><MarkdownPreview content={content} /></div>
      </section>

      <aside className="panel backlinks-panel">
        <div className="backlink-header"><h2>Backlinks</h2><span className="muted">{backlinks.length}</span></div>
        {loadingBacklinks ? <p className="status">Cargando backlinks…</p> : backlinks.length ? <div className="backlink-list">{backlinks.map((backlink) => <div className="backlink" key={`${backlink.source_note_id}-${backlink.line}`}><strong>{backlink.title}</strong><p className="muted">Línea {backlink.line}{backlink.alias ? ` · ${backlink.alias}` : ''}</p><span>{backlink.excerpt}</span></div>)}</div> : <p className="empty">Ninguna nota enlaza aquí todavía.</p>}
      </aside>

      {showCardCreator && selectedNote && <CardCreator noteId={selectedNote.id} selectedText={selectedText} templates={templates} onClose={() => setShowCardCreator(false)} onCreated={() => setShowCardCreator(false)} onError={onError} />}
    </div>
  );
}
