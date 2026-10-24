import { describe, expect, it } from 'vitest';
import { extractWikiLinks, initialSchedulerState, renderTemplate, review, titleKey } from './index';

describe('title keys and wiki links', () => {
  it('normalizes title keys and ignores code', () => {
    expect(titleKey('  Café  del\n  Día ')).toBe('café del día');
    expect(extractWikiLinks('[[Home]] `[[Ignored]]`\n```\n[[Also ignored]]\n```\n[[Home|alias]]')).toMatchObject([
      { targetKey: 'home', alias: null, line: 1 },
      { targetKey: 'home', alias: 'alias', line: 5 },
    ]);
  });
  it('keeps hash sections literal', () => { expect(extractWikiLinks('[[Title#Section]]')[0].targetKey).toBe('title#section'); });
});

describe('safe templates', () => {
  const template = { fields: ['Front', 'Back'], frontHtml: '<h1>{{Front}}</h1>{{#Back}}<p>{{Back}}</p>{{/Back}}', backHtml: '{{FrontSide}}<hr>{{Back}}', css: 'h1 { color: red; }' };
  it('escapes values, renders conditionals, front side, and CSP', () => { const rendered = renderTemplate(template, { Front: '<x>', Back: 'answer' }, 'back').html; expect(rendered).toContain('&lt;x&gt;'); expect(rendered).toContain('<hr>answer'); expect(rendered).toContain("default-src 'none'"); });
  it('rejects unknown and unsafe content', () => { expect(() => renderTemplate(template, { Other: 'x' }, 'front')).toThrow('Unknown'); expect(() => renderTemplate({ ...template, frontHtml: '<script>x</script>' }, {}, 'front')).toThrow('Unsafe'); expect(() => renderTemplate({ ...template, frontHtml: '<div onclick="x">x</div>' }, {}, 'front')).toThrow('Unsafe'); expect(() => renderTemplate({ ...template, css: 'body{background:url(https://x)}' }, {}, 'front')).toThrow('Unsafe'); });
});

describe('SM-2 scheduler', () => {
  const now = new Date('2025-01-01T00:00:00.000Z');
  it('follows initial, good, easy, again and hard rules', () => { const initial = initialSchedulerState(now); expect(initial.ease).toBe(2.5); const good = review(initial, 'good', now); expect(good.intervalDays).toBe(1); const easy = review(good, 'easy', now); expect(easy.intervalDays).toBe(4); expect(easy.ease).toBeCloseTo(2.65); const again = review(easy, 'again', now); expect(again.intervalDays).toBe(1); expect(again.repetitions).toBe(0); const hard = review(again, 'hard', now); expect(hard.intervalDays).toBe(1); expect(hard.ease).toBeCloseTo(2.3); });
});
