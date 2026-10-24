import { Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import { ClockController, NotesController, TemplatesController, RenderController, CardsController, ReviewController } from './controllers';
import { DATABASE, createDatabase } from './database';
import { AppClock } from './clock';
import { CardsService, NotesService, RenderService, TemplatesService } from './services';

@Module({
  controllers: [NotesController, TemplatesController, RenderController, CardsController, ReviewController, ClockController],
  providers: [
    { provide: DATABASE, useFactory: () => createDatabase() },
    AppClock,
    { provide: NotesService, useFactory: (db: Database.Database, clock: AppClock) => new NotesService(db, clock), inject: [DATABASE, AppClock] },
    { provide: TemplatesService, useFactory: (db: Database.Database) => new TemplatesService(db), inject: [DATABASE] },
    { provide: RenderService, useFactory: (templates: TemplatesService) => new RenderService(templates), inject: [TemplatesService] },
    { provide: CardsService, useFactory: (db: Database.Database, templates: TemplatesService, clock: AppClock) => new CardsService(db, templates, clock), inject: [DATABASE, TemplatesService, AppClock] },
  ],
})
export class AppModule {}
