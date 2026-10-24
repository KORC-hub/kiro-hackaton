import { DomainError } from './errors';

export interface TemplateDefinition { fields: string[]; frontHtml: string; backHtml: string; css: string; }
export interface RenderedDocument { html: string; }

const allowedTags = new Set(['a', 'b', 'blockquote', 'br', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'span', 'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'u', 'ul']);
const allowedAttributes = new Set(['alt', 'class', 'height', 'href', 'id', 'src', 'title', 'width']);
const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r?\n/g, '<br>');
const fieldText = (value: unknown): string => escapeHtml(String(value ?? ''));

export function validateTemplateFields(template: TemplateDefinition, fields: Record<string, unknown>): void {
  const declared = new Set(template.fields);
  const unknown = Object.keys(fields).filter((name) => !declared.has(name));
  const nonText = Object.entries(fields).filter(([, value]) => typeof value !== 'string').map(([name]) => name);
  if (unknown.length) throw new DomainError('validation', 'Unknown template fields', { unknown });
  if (nonText.length) throw new DomainError('validation', 'Template field values must be strings', { fields: nonText });
}

function referencedFields(markup: string): string[] {
  const names = new Set<string>();
  const pattern = /{{\s*([#^/]?)([^{}]+?)\s*}}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markup)) !== null) { const name = match[2].trim(); if (name !== 'FrontSide') names.add(name); }
  return [...names];
}

export function validateTemplateDefinition(template: TemplateDefinition): void {
  const declared = new Set(template.fields);
  const unknown = [...new Set([...referencedFields(template.frontHtml), ...referencedFields(template.backHtml)].filter((name) => !declared.has(name)))];
  if (unknown.length) throw new DomainError('validation', 'Template references undeclared fields', { unknown });
  if (template.frontHtml.includes('{{FrontSide}}')) throw new DomainError('validation', 'FrontSide is only available on the back side');
  sanitizeMarkup(template.frontHtml);
  sanitizeMarkup(template.backHtml);
  sanitizeCss(template.css);
}

function sanitizeMarkup(markup: string): void {
  if (/<\/?(script|iframe|object|embed|form)\b|\bon[a-z]+\s*=|javascript\s*:/iu.test(markup)) throw new DomainError('validation', 'Unsafe html content');
  const tags = /<\s*(\/?)\s*([a-z][\w-]*)\b([^>]*)>/giu;
  let tag: RegExpExecArray | null;
  while ((tag = tags.exec(markup)) !== null) {
    if (!allowedTags.has(tag[2].toLowerCase())) throw new DomainError('validation', `HTML tag is not allowed: ${tag[2]}`);
    if (tag[1]) continue;
    const attributes = tag[3];
    const attrPattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrPattern.exec(attributes)) !== null) {
      const name = attr[1].toLowerCase();
      const value = attr[2] ?? attr[3] ?? attr[4] ?? '';
      if (!allowedAttributes.has(name) || name.startsWith('on') || name === 'style') throw new DomainError('validation', `HTML attribute is not allowed: ${name}`);
      if ((name === 'href' || name === 'src') && value.includes('{{')) throw new DomainError('validation', 'Dynamic URLs are not allowed');
      if ((name === 'href' || name === 'src') && !/^(?:#|https?:|mailto:|data:image\/)/iu.test(value)) throw new DomainError('validation', 'URL scheme is not allowed');
    }
  }
}

function sanitizeCss(css: string): void {
  if (/[<>]|url\s*\(|expression\s*\(|@import|<\/style>|<script/iu.test(css)) throw new DomainError('validation', 'Unsafe css content');
}

function renderMarkup(markup: string, template: TemplateDefinition, fields: Record<string, unknown>, frontSide?: string): string {
  validateTemplateFields(template, fields);
  let output = markup.replace(/{{([#^])([^{}]+)}}([\s\S]*?){{\/\2}}/g, (_whole, mode: string, name: string, body: string) => {
    const value = String(fields[name.trim()] ?? '');
    return (mode === '#' ? value.length > 0 : value.length === 0) ? renderMarkup(body, template, fields, frontSide) : '';
  });
  output = output.replace(/{{FrontSide}}/g, frontSide ?? '');
  output = output.replace(/{{\s*([^{}#^/][^{}]*)\s*}}/g, (_whole, name: string) => fieldText(fields[name.trim()]));
  return output;
}

export function renderTemplate(template: TemplateDefinition, fields: Record<string, unknown>, side: 'front' | 'back'): RenderedDocument {
  validateTemplateDefinition(template);
  validateTemplateFields(template, fields);
  const front = renderMarkup(template.frontHtml, template, fields);
  const body = side === 'front' ? front : renderMarkup(template.backHtml, template, fields, front);
  return { html: `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"><style>${template.css}</style></head><body>${body}</body></html>` };
}
