import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module';
import { ErrorFilter } from './http';

let app: INestApplication;

describe('API MVP', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SQLITE_PATH = ':memory:';
    app = await NestFactory.create(AppModule, { logger: false });
    app.useGlobalFilters(new ErrorFilter());
    await app.init();
  });
  afterAll(async () => { if (app) await app.close(); });

  it('returns 422 for null or non-object request bodies', async () => {
    await request(app.getHttpServer()).post('/notes').send(null as unknown as object).expect(422);
    await request(app.getHttpServer()).put('/notes/1').send([]).expect(422);
    await request(app.getHttpServer()).post('/templates').send(null as unknown as object).expect(422);
    await request(app.getHttpServer()).post('/render').send(null as unknown as object).expect(422);
    await request(app.getHttpServer()).post('/cards').send(null as unknown as object).expect(422);
    await request(app.getHttpServer()).post('/review/1').send(null as unknown as object).expect(422);
  });

  it('rejects duplicate normalized note titles with 409', async () => {
    await request(app.getHttpServer()).post('/notes').send({ title: 'Café', content: '' }).expect(201);
    await request(app.getHttpServer()).post('/notes').send({ title: ' café ', content: 'other' }).expect(409);
  });

  it('rejects unknown fields and an empty first card field with 422', async () => {
    const template = { name: 'Test', fields: ['Front', 'Back'], frontHtml: '{{Front}}', backHtml: '{{Back}}', css: '' };
    const created = await request(app.getHttpServer()).post('/templates').send(template).expect(201);
    await request(app.getHttpServer()).post('/cards').send({ templateId: created.body.id, fields: { Front: 'x', Other: 'y' } }).expect(422);
    await request(app.getHttpServer()).post('/cards').send({ templateId: created.body.id, fields: { Front: '', Back: 'y' } }).expect(422);
  });

  it('runs note to card to review and resolves backlinks', async () => {
    const target = await request(app.getHttpServer()).post('/notes').send({ title: 'Target', content: 'body' }).expect(201);
    const source = await request(app.getHttpServer()).post('/notes').send({ title: 'Source', content: 'See [[Target|the target]] and [[Target|again]]' }).expect(201);
    const backlinks = await request(app.getHttpServer()).get(`/notes/${target.body.id}/backlinks`).expect(200);
    expect(backlinks.body).toHaveLength(1);
    expect(backlinks.body[0].title).toBe('Source');
    await request(app.getHttpServer()).put(`/notes/${source.body.id}`).send({ content: 'Updated [[Target]]' }).expect(200);
    const updatedBacklinks = await request(app.getHttpServer()).get(`/notes/${target.body.id}/backlinks`).expect(200);
    expect(updatedBacklinks.body).toHaveLength(1);
    const templates = await request(app.getHttpServer()).get('/templates').expect(200);
    const card = await request(app.getHttpServer()).post('/cards').send({ templateId: templates.body[0].id, fields: { Front: 'Question', Back: 'Answer' }, sourceNoteId: source.body.id }).expect(201);
    expect(card.body.dueAt).toBeTruthy();
    const reviewed = await request(app.getHttpServer()).post(`/review/${card.body.id}`).send({ rating: 'good' }).expect(201);
    expect(reviewed.body.intervalDays).toBe(1);
    expect(reviewed.body.repetitions).toBe(1);
    const queue = await request(app.getHttpServer()).get('/review/queue').expect(200);
    expect(queue.body.some((item: { id: number }) => item.id === card.body.id)).toBe(false);
    const cards = await request(app.getHttpServer()).get('/cards').expect(200);
    expect(cards.body.some((item: { id: number }) => item.id === card.body.id)).toBe(true);
  });

  it('keeps the development clock unavailable in production', async () => {
    const previousEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer()).post('/dev/clock').send({ offsetDays: 1 }).expect(404);
    } finally {
      process.env.NODE_ENV = previousEnvironment;
    }
  });

  it('returns complete srcdoc and rejects unsafe render payloads', async () => {
    const safe = { name: 'Render', fields: ['Front'], frontHtml: '<b>{{Front}}</b>', backHtml: '{{FrontSide}}', css: 'b { color: red; }' };
    const rendered = await request(app.getHttpServer()).post('/render').send({ template: safe, fields: { Front: '<x>' }, side: 'front' }).expect(201);
    expect(rendered.body.srcdoc).toContain('<!doctype html>');
    expect(rendered.body.srcdoc).toContain('&lt;x&gt;');
    await request(app.getHttpServer()).post('/render').send({ template: { ...safe, frontHtml: '<script>x</script>' }, fields: { Front: 'x' }, side: 'front' }).expect(422);
  });
});
