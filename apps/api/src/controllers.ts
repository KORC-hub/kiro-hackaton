import { Body, Controller, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { NotesService, TemplatesService, RenderService, CardsService } from './services';
import { AppClock } from './clock';
import { DomainError } from '@app/core';
import { parseObject } from './http';

const id = (value: string): number => { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new DomainError('validation', 'id must be a positive integer'); return parsed; };

@Controller('notes')
export class NotesController {
  constructor(@Inject(NotesService) private readonly service: NotesService) {}
  @Post() create(@Body() body: unknown): object { return this.service.create(parseObject(body, 'body')); }
  @Get() list(): object[] { return this.service.list(); }
  @Get(':id') get(@Param('id') value: string): object { return this.service.get(id(value)); }
  @Put(':id') update(@Param('id') value: string, @Body() body: unknown): object { return this.service.update(id(value), parseObject(body, 'body')); }
  @Get(':id/backlinks') backlinks(@Param('id') value: string): object[] { return this.service.backlinks(id(value)); }
}

@Controller('templates')
export class TemplatesController {
  constructor(@Inject(TemplatesService) private readonly service: TemplatesService) {}
  @Post() create(@Body() body: unknown): object { return this.service.create(parseObject(body, 'body')); }
  @Get() list(): object[] { return this.service.list(); }
  @Put(':id') update(@Param('id') value: string, @Body() body: unknown): object { return this.service.update(id(value), parseObject(body, 'body')); }
}

@Controller('render')
export class RenderController {
  constructor(@Inject(RenderService) private readonly service: RenderService) {}
  @Post() render(@Body() body: unknown): object { return this.service.render(parseObject(body, 'body')); }
}

@Controller('cards')
export class CardsController {
  constructor(@Inject(CardsService) private readonly service: CardsService) {}
  @Post() create(@Body() body: unknown): object { return this.service.create(parseObject(body, 'body')); }
  @Get() list(): object[] { return this.service.list(); }
  @Get(':id') get(@Param('id') value: string): object { return this.service.get(id(value)); }
}

@Controller('review')
export class ReviewController {
  constructor(@Inject(CardsService) private readonly service: CardsService) {}
  @Get('queue') queue(): object[] { return this.service.queue(); }
  @Post(':cardId') review(@Param('cardId') value: string, @Body() body: unknown): object { return this.service.review(id(value), parseObject(body, 'body')); }
}

@Controller('dev/clock')
export class ClockController {
  constructor(@Inject(AppClock) private readonly clock: AppClock) {}
  @Post() set(@Body() body: Record<string, unknown>): object { if (process.env.NODE_ENV === 'production') throw new DomainError('not_found', 'Not found'); const offset = body.offsetDays; if (typeof offset !== 'number' || !Number.isFinite(offset)) throw new DomainError('validation', 'offsetDays must be a number'); return { now: this.clock.setOffsetDays(offset).toISOString() }; }
}
