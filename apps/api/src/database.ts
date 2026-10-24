import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const DATABASE = Symbol('DATABASE');

export function createDatabase(filename = process.env.SQLITE_PATH ?? './data/app.sqlite'): Database.Database {
  if (filename !== ':memory:' && !filename.startsWith('file:')) mkdirSync(dirname(filename), { recursive: true });
  const database = new Database(filename);
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, title_key TEXT NOT NULL UNIQUE, content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS links (source_note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE, target_key TEXT NOT NULL, alias TEXT, line INTEGER NOT NULL, excerpt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS templates (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, fields_json TEXT NOT NULL, front_html TEXT NOT NULL, back_html TEXT NOT NULL, css TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cards (id INTEGER PRIMARY KEY AUTOINCREMENT, template_id INTEGER NOT NULL REFERENCES templates(id), fields_json TEXT NOT NULL, source_note_id INTEGER REFERENCES notes(id) ON DELETE SET NULL, ease REAL NOT NULL, interval_days INTEGER NOT NULL, repetitions INTEGER NOT NULL, due_at TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE, rating TEXT NOT NULL, reviewed_at TEXT NOT NULL, prev_state_json TEXT NOT NULL, next_state_json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS links_target_idx ON links(target_key);
    CREATE INDEX IF NOT EXISTS cards_due_idx ON cards(due_at, id);
  `);
  const hasTemplate = database.prepare('SELECT 1 FROM templates LIMIT 1').get();
  if (!hasTemplate) database.prepare('INSERT INTO templates (name, fields_json, front_html, back_html, css) VALUES (?, ?, ?, ?, ?)').run('Basic', JSON.stringify(['Front', 'Back']), '<div>{{Front}}</div>', '{{FrontSide}}<hr><div>{{Back}}</div>', 'body { font-family: sans-serif; }');
  return database;
}
