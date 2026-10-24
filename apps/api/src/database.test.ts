import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase } from './database';

const databases: Array<{ close: () => void; directory?: string }> = [];

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close();
    if (database.directory) rmSync(database.directory, { recursive: true, force: true });
  }
});

describe('createDatabase', () => {
  it('creates the parent directory for a local database file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'markdown-study-'));
    const databaseDirectory = join(directory, 'nested');
    const database = createDatabase(join(databaseDirectory, 'app.sqlite'));
    databases.push({ close: () => database.close(), directory });

    expect(databaseDirectory).toMatch(/nested$/);
    expect(database.prepare('SELECT COUNT(*) AS count FROM notes').get()).toEqual({ count: 0 });
  });

  it('keeps the in-memory database available', () => {
    const database = createDatabase(':memory:');
    databases.push({ close: () => database.close() });

    expect(database.prepare('SELECT 1 AS value').get()).toEqual({ value: 1 });
  });
});
