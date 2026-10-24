import { titleKey } from './title';

export interface WikiLink {
  targetTitle: string;
  targetKey: string;
  alias: string | null;
  line: number;
  excerpt: string;
}

function maskedMarkdown(content: string): string {
  let result = content.replace(/```[\s\S]*?(?:```|$)/g, (block) => block.replace(/[^\n]/g, ' '));
  result = result.replace(/`[^`\n]*`/g, (code) => code.replace(/[^\n]/g, ' '));
  return result;
}

export function extractWikiLinks(content: string): WikiLink[] {
  const masked = maskedMarkdown(content);
  const links: WikiLink[] = [];
  const pattern = /\[\[([^\]\n]+?)(?:\|([^\]\n]*))?\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(masked)) !== null) {
    const rawTarget = match[1].trim();
    const alias = match[2] === undefined ? null : match[2];
    const line = masked.slice(0, match.index).split('\n').length;
    const lineText = content.split('\n')[line - 1] ?? '';
    links.push({ targetTitle: rawTarget, targetKey: titleKey(rawTarget), alias, line, excerpt: lineText.trim().slice(0, 240) });
  }
  return links;
}
