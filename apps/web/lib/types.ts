export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Backlink {
  source_note_id: number;
  title: string;
  title_key: string;
  alias: string | null;
  line: number;
  excerpt: string;
}

export interface Template {
  id: number;
  name: string;
  fields: string[];
  frontHtml: string;
  backHtml: string;
  css: string;
}

export interface Card {
  id: number;
  templateId: number;
  fields: Record<string, string>;
  sourceNoteId: number | null;
  ease: number;
  intervalDays: number;
  repetitions: number;
  dueAt: string;
  createdAt: string;
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
