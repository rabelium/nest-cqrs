import { HttpException, Inject, Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { filter, firstValueFrom, Subject } from 'rxjs';
import { Event } from '../interfaces';

@Injectable()
export class EventBus {
  constructor(@Optional() @Inject('SUBJECT') private readonly event$: Subject<Event>) {
    if (!event$) {
      this.event$ = new Subject<Event>();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on<T = any, R = any>(type: string, handler: (payload: T) => Promise<R>) {
    this.event$.pipe(filter(e => e.type === type)).subscribe(async event => {
      try {
        const result = await handler(event.payload as T);
        if (event.correlationId) {
          this.event$.next({
            type: `${type}_response`,
            payload: result,
            correlationId: event.correlationId,
          });
        }
      } catch (err) {
        if (event.correlationId) {
          this.event$.next({
            type: `${type}_error`,
            payload: err,
            correlationId: event.correlationId,
          });
        }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit<T = any>(type: string, payload: T): void {
    this.event$.next({ type, payload });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute<T = any, R = any>(type: string, payload?: T): Promise<R> {
    const correlationId = randomUUID();
    this.event$.next({ type, payload, correlationId });

    const response = await firstValueFrom(
      this.event$.pipe(
        filter(
          e =>
            (e.type === `${type}_response` || e.type === `${type}_error`) &&
            e.correlationId === correlationId,
        ),
      ),
    );

    if (response.type === `${type}_error`) {
      if (response.payload instanceof Error) {
        throw response.payload;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorPayload = response.payload as any;
      throw new HttpException(errorPayload.message, errorPayload.status);
    }

    return response.payload as R;
  }
}
