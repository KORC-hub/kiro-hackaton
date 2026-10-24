import Database from 'better-sqlite3';
import { DomainError, initialSchedulerState, Rating, renderTemplate, review, TemplateDefinition, titleKey, validateTemplateDefinition, validateTemplateFields } from '@app/core';
import { AppClock } from './clock';
import { CardsRepository, noteJson, NotesRepository, cardJson, TemplateRow, templateDefinition, TemplatesRepository } from './repositories';
import { parseObject } from './http';

export class NotesService {
  private readonly notes: NotesRepository;
  constructor(db: Database.Database, private readonly clock: AppClock) { this.notes = new NotesRepository(db); }
  create(body: Record<string, unknown>): object { const title = this.text(body.title, 'title'); const content = this.text(body.content, 'content'); if (!title.trim()) throw new DomainError('validation', 'Title is required'); try { const row = this.notes.create(title, titleKey(title), content, this.clock.now().toISOString()); this.notes.replaceLinks(row.id, content); return noteJson(row); } catch (error) { if (String(error).includes('UNIQUE')) throw new DomainError('conflict', 'A note with this title already exists'); throw error; } }
  list(): object[] { return this.notes.list().map(noteJson); }
  get(id: number): object { const row = this.notes.get(id); if (!row) throw new DomainError('not_found', 'Note not found'); return noteJson(row); }
  update(id: number, body: Record<string, unknown>): object { if ('title' in body) throw new DomainError('validation', 'Only content can be updated'); const content = this.text(body.content, 'content'); const row = this.notes.updateContentAndLinks(id, content, this.clock.now().toISOString()); if (!row) throw new DomainError('not_found', 'Note not found'); return noteJson(row); }
  backlinks(id: number): object[] { if (!this.notes.get(id)) throw new DomainError('not_found', 'Note not found'); return this.notes.backlinks(id); }
  private text(value: unknown, name: string): string { if (typeof value !== 'string') throw new DomainError('validation', `${name} must be a string`); return value; }
}

export class TemplatesService {
  private readonly templates: TemplatesRepository;
  constructor(db: Database.Database) { this.templates = new TemplatesRepository(db); }
  create(body: Record<string, unknown>): object { try { return this.toJson(this.templates.create(this.definition(body))); } catch (error) { if (String(error).includes('UNIQUE')) throw new DomainError('conflict', 'A template with this name already exists'); throw error; } }
  list(): object[] { return this.templates.list().map((row) => this.toJson(row)); }
  get(id: number): TemplateDefinition & { id: number; name: string } { const row = this.templates.get(id); if (!row) throw new DomainError('not_found', 'Template not found'); return this.toJson(row) as TemplateDefinition & { id: number; name: string }; }
  update(id: number, body: Record<string, unknown>): object { try { const row = this.templates.update(id, this.definition(body)); if (!row) throw new DomainError('not_found', 'Template not found'); return this.toJson(row); } catch (error) { if (String(error).includes('UNIQUE')) throw new DomainError('conflict', 'A template with this name already exists'); throw error; } }
  definition(body: Record<string, unknown>): TemplateDefinition & { name: string } { const fields = body.fields; if (!Array.isArray(fields) || fields.some((field) => typeof field !== 'string') || new Set(fields).size !== fields.length || fields.length === 0) throw new DomainError('validation', 'fields must be a non-empty unique string array'); const definition = { name: this.text(body.name, 'name'), fields, frontHtml: this.text(body.frontHtml, 'frontHtml'), backHtml: this.text(body.backHtml, 'backHtml'), css: this.text(body.css ?? '', 'css') }; validateTemplateDefinition(definition); return definition; }
  private text(value: unknown, name: string): string { if (typeof value !== 'string') throw new DomainError('validation', `${name} must be a string`); return value; }
  private toJson(row: TemplateRow): object { const definition = templateDefinition(row); return { id: row.id, ...definition }; }
}

export class RenderService {
  constructor(private readonly templates: TemplatesService) {}
  render(body: Record<string, unknown>): object { const fields = parseObject(body.fields, 'fields'); const side = body.side; if (side !== 'front' && side !== 'back') throw new DomainError('validation', 'side must be front or back'); let definition: TemplateDefinition; if (body.templateId !== undefined) definition = this.templates.get(Number(body.templateId)); else if (body.template && typeof body.template === 'object') definition = this.templates.definition(body.template as Record<string, unknown>); else throw new DomainError('validation', 'template or templateId is required'); return { srcdoc: renderTemplate(definition, fields, side).html }; }
}

export class CardsService {
  private readonly cards: CardsRepository;
  private readonly notes: NotesRepository;
  constructor(db: Database.Database, private readonly templates: TemplatesService, private readonly clock: AppClock) { this.cards = new CardsRepository(db); this.notes = new NotesRepository(db); }
  create(body: Record<string, unknown>): object { const templateId = Number(body.templateId); if (!Number.isInteger(templateId) || templateId < 1) throw new DomainError('validation', 'templateId must be a positive integer'); const template = this.templates.get(templateId); const fields = parseObject(body.fields, 'fields'); validateTemplateFields(template, fields); const first = fields[template.fields[0]]; if (typeof first !== 'string' || first.trim() === '') throw new DomainError('validation', 'The first field cannot be empty'); const source = body.sourceNoteId === undefined || body.sourceNoteId === null ? null : Number(body.sourceNoteId); if (source !== null && (!Number.isInteger(source) || source < 1)) throw new DomainError('validation', 'sourceNoteId must be a positive integer'); if (source !== null && !this.notes.get(source)) throw new DomainError('not_found', 'Source note not found'); const now = this.clock.now(); const state = initialSchedulerState(now); return cardJson(this.cards.create(templateId, fields, source, { ...state, dueAt: state.dueAt.toISOString() }, now.toISOString())); }
  list(): object[] { return this.cards.list().map(cardJson); }
  get(id: number): object { const card = this.cards.get(id); if (!card) throw new DomainError('not_found', 'Card not found'); return cardJson(card); }
  queue(): object[] { return this.cards.queue(this.clock.now().toISOString()).map(cardJson); }
  review(id: number, body: Record<string, unknown>): object { const card = this.cards.get(id); if (!card) throw new DomainError('not_found', 'Card not found'); const rating = body.rating; if (!['again', 'hard', 'good', 'easy'].includes(String(rating))) throw new DomainError('validation', 'rating must be again, hard, good, or easy'); const previous = { ease: card.ease, intervalDays: card.interval_days, repetitions: card.repetitions, dueAt: card.due_at }; const now = this.clock.now(); const next = review({ ease: card.ease, intervalDays: card.interval_days, repetitions: card.repetitions, dueAt: new Date(card.due_at) }, rating as Rating, now); const state = { ease: next.ease, intervalDays: next.intervalDays, repetitions: next.repetitions, dueAt: next.dueAt.toISOString() }; this.cards.applyReview(id, state, String(rating), now.toISOString(), previous); return this.get(id); }
}
