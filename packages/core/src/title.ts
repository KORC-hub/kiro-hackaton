export function titleKey(title: string): string {
  return title.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase();
}
