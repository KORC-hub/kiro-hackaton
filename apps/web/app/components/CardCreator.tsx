'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Template } from '../../lib/types';

interface CardCreatorProps {
  noteId: number;
  selectedText: string;
  templates: Template[];
  onClose: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
}

export function CardCreator({ noteId, selectedText, templates, onClose, onCreated, onError }: CardCreatorProps) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? 0);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [srcDoc, setSrcDoc] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const template = templates.find((item) => item.id === templateId) ?? templates[0];

  useEffect(() => {
    if (!template) return;
    setFields((current) => Object.fromEntries(template.fields.map((field, index) => [field, current[field] ?? (index === 0 ? selectedText : '')])));
  }, [template, selectedText]);

  useEffect(() => {
    if (!template) return;
    setLoadingPreview(true);
    api.render(template.id, fields, side)
      .then((result) => setSrcDoc(result.srcdoc))
      .catch((error: unknown) => onError(error instanceof ApiError ? error.message : 'No se pudo generar la vista previa.'))
      .finally(() => setLoadingPreview(false));
  }, [template, fields, side, onError]);

  async function createCard() {
    if (!template) return;
    setSaving(true);
    try {
      await api.createCard(template.id, fields, noteId);
      onCreated();
    } catch (error) {
      onError(error instanceof ApiError ? error.message : 'No se pudo crear la tarjeta.');
    } finally {
      setSaving(false);
    }
  }

  if (!template) return null;

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="card-creator-title">
      <div className="modal-header"><h2 id="card-creator-title">Crear tarjeta</h2><button className="secondary-button" onClick={onClose}>Cerrar</button></div>
      <div className="form-grid">
        <label>Plantilla<select className="template-select" value={template.id} onChange={(event) => setTemplateId(Number(event.target.value))}>{templates.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        {template.fields.map((field) => <label key={field}>{field}<textarea className="field-input" rows={3} value={fields[field] ?? ''} onChange={(event) => setFields({ ...fields, [field]: event.target.value })} /></label>)}
      </div>
      <h3>Vista previa segura</h3>
      <div className="side-toggle"><button className={side === 'front' ? 'active' : ''} onClick={() => setSide('front')}>Frontal</button><button className={side === 'back' ? 'active' : ''} onClick={() => setSide('back')}>Reverso</button></div>
      {loadingPreview && <p className="status">Generando vista previa…</p>}
      <iframe className="iframe-preview" title="Vista previa de la tarjeta" sandbox="" srcDoc={srcDoc} />
      <div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={createCard} disabled={saving}>{saving ? 'Creando…' : 'Crear tarjeta'}</button></div>
    </section>
  </div>;
}
