import { Clock } from '@app/core';

export class AppClock {
  private offsetMs = 0;
  constructor(private readonly systemNow: () => Date = () => new Date()) {}
  now(): Date { return new Date(this.systemNow().getTime() + this.offsetMs); }
  setOffsetDays(days: number): Date { this.offsetMs = days * 24 * 60 * 60 * 1000; return this.now(); }
  asClock(): Clock { return () => this.now(); }
}
