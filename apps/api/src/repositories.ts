import Database from 'better-sqlite3';
import { extractWikiLinks, TemplateDefinition } from '@app/core';

export interface NoteRow { id: number; title: string; title_key: string; content: string; created_at: string; updated_at: string; }
export interface TemplateRow { id: number; name: string; fields_json: string; front_html: string; back_html: string; css: string; }
export interface CardRow { id: number; template_id: number; fields_json: string; source_note_id: number | null; ease: number; interval_days: number; repetitions: number; due_at: string; created_at: string; }

export class NotesRepository {
  constructor(private readonly db: Database.Database) {}
  create(title: string, key: string, content: string, now: string): NoteRow {
    const result = this.db.prepare('INSERT INTO notes (title,title_key,content,created_at,updated_at) VALUES (?,?,?,?,?)').run(title, key, content, now, now);
    return this.get(Number(result.lastInsertRowid))!;
  }
  get(id: number): NoteRow | undefined { return this.db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined; }
  list(): NoteRow[] { return this.db.prepare('SELECT * FROM notes ORDER BY id').all() as NoteRow[]; }
  updateContent(id: number, content: string, now: string): NoteRow | undefined { this.db.prepare('UPDATE notes SET content=?,updated_at=? WHERE id=?').run(content, now, id); return this.get(id); }
  updateContentAndLinks(id: number, content: string, now: string): NoteRow | undefined {
    const links = extractWikiLinks(content);
    const transaction = this.db.transaction(() => {
      const result = this.db.prepare('UPDATE notes SET content=?,updated_at=? WHERE id=?').run(content, now, id);
      if (result.changes === 0) return undefined;
      this.replaceLinksRows(id, links);
      return this.get(id);
    });
    return transaction();
  }
  replaceLinks(id: number, content: string): void {
    this.replaceLinksTransaction(id, extractWikiLinks(content));
  }
  private replaceLinksTransaction(id: number, links: ReturnType<typeof extractWikiLinks>): void {
    const transaction = this.db.transaction(() => this.replaceLinksRows(id, links));
    transaction();
  }
  private replaceLinksRows(id: number, links: ReturnType<typeof extractWikiLinks>): void {
    const insert = this.db.prepare('INSERT INTO links (source_note_id,target_key,alias,line,excerpt) VALUES (?,?,?,?,?)');
    this.db.prepare('DELETE FROM links WHERE source_note_id=?').run(id);
    for (const link of links) insert.run(id, link.targetKey, link.alias, link.line, link.excerpt);
  }
  backlinks(id: number): Array<Record<string, unknown>> {
    const note = this.get(id); if (!note) return [];
    const rows = this.db.prepare(`SELECT l.source_note_id, n.title, n.title_key, l.alias, l.line, l.excerpt FROM links l JOIN notes n ON n.id=l.source_note_id WHERE l.target_key=? AND l.source_note_id<>? ORDER BY n.id, l.line`).all(note.title_key, id) as Array<Record<string, unknown>>;
    const seen = new Set<number>(); return rows.filter((row) => { const source = Number(row.source_note_id); if (seen.has(source)) return false; seen.add(source); return true; });
  }
}

export class TemplatesRepository {
  constructor(private readonly db: Database.Database) {}
  create(definition: TemplateDefinition & { name: string }): TemplateRow { const result = this.db.prepare('INSERT INTO templates (name,fields_json,front_html,back_html,css) VALUES (?,?,?,?,?)').run(definition.name, JSON.stringify(definition.fields), definition.frontHtml, definition.backHtml, definition.css); return this.get(Number(result.lastInsertRowid))!; }
  list(): TemplateRow[] { return this.db.prepare('SELECT * FROM templates ORDER BY id').all() as TemplateRow[]; }
  get(id: number): TemplateRow | undefined { return this.db.prepare('SELECT * FROM templates WHERE id=?').get(id) as TemplateRow | undefined; }
  update(id: number, definition: TemplateDefinition & { name: string }): TemplateRow | undefined { this.db.prepare('UPDATE templates SET name=?,fields_json=?,front_html=?,back_html=?,css=? WHERE id=?').run(definition.name, JSON.stringify(definition.fields), definition.frontHtml, definition.backHtml, definition.css, id); return this.get(id); }
}

export class CardsRepository {
  constructor(private readonly db: Database.Database) {}
  create(templateId: number, fields: Record<string, unknown>, sourceNoteId: number | null, state: { ease: number; intervalDays: number; repetitions: number; dueAt: string }, now: string): CardRow { const result = this.db.prepare('INSERT INTO cards (template_id,fields_json,source_note_id,ease,interval_days,repetitions,due_at,created_at) VALUES (?,?,?,?,?,?,?,?)').run(templateId, JSON.stringify(fields), sourceNoteId, state.ease, state.intervalDays, state.repetitions, state.dueAt, now); return this.get(Number(result.lastInsertRowid))!; }
  list(): CardRow[] { return this.db.prepare('SELECT * FROM cards ORDER BY id').all() as CardRow[]; }
  get(id: number): CardRow | undefined { return this.db.prepare('SELECT * FROM cards WHERE id=?').get(id) as CardRow | undefined; }
  queue(now: string, limit = 20): CardRow[] { return this.db.prepare('SELECT * FROM cards WHERE due_at<=? ORDER BY due_at,id LIMIT ?').all(now, limit) as CardRow[]; }
  updateState(id: number, state: { ease: number; intervalDays: number; repetitions: number; dueAt: string }): void { this.db.prepare('UPDATE cards SET ease=?,interval_days=?,repetitions=?,due_at=? WHERE id=?').run(state.ease, state.intervalDays, state.repetitions, state.dueAt, id); }
  addReview(cardId: number, rating: string, reviewedAt: string, previous: object, next: object): void { this.db.prepare('INSERT INTO reviews (card_id,rating,reviewed_at,prev_state_json,next_state_json) VALUES (?,?,?,?,?)').run(cardId, rating, reviewedAt, JSON.stringify(previous), JSON.stringify(next)); }
  applyReview(id: number, state: { ease: number; intervalDays: number; repetitions: number; dueAt: string }, rating: string, reviewedAt: string, previous: object): void {
    const transaction = this.db.transaction(() => {
      this.updateState(id, state);
      this.addReview(id, rating, reviewedAt, previous, state);
    });
    transaction();
  }
}


export function templateDefinition(row: TemplateRow): TemplateDefinition & { name: string } { return { name: row.name, fields: JSON.parse(row.fields_json) as string[], frontHtml: row.front_html, backHtml: row.back_html, css: row.css }; }
export function noteJson(row: NoteRow): object { return { id: row.id, title: row.title, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at }; }
export function cardJson(row: CardRow): object { return { id: row.id, templateId: row.template_id, fields: JSON.parse(row.fields_json), sourceNoteId: row.source_note_id, ease: row.ease, intervalDays: row.interval_days, repetitions: row.repetitions, dueAt: row.due_at, createdAt: row.created_at }; }
