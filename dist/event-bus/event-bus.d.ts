import { Subject } from 'rxjs';
import { Event } from '../interfaces';
export declare class EventBus {
    private readonly event$;
    constructor(event$: Subject<Event>);
    on<T = any, R = any>(type: string, handler: (payload: T) => Promise<R>): void;
    emit<T = any>(type: string, payload: T): void;
    execute<T = any, R = any>(type: string, payload?: T): Promise<R>;
}
