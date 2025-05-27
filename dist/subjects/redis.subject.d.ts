import { Subject } from 'rxjs';
import { RedisOptions, Event } from '../interfaces';
export declare class RedisSubject extends Subject<Event> {
    private readonly options;
    private readonly logger;
    private publisher;
    private subscriber;
    private isConnected;
    private initialization_promise;
    private readonly channel_name;
    constructor(options: RedisOptions);
    private initialize;
    next(value: Event): void;
    private publishToRedis;
    error(err: Error): void;
    complete(): void;
    waitForConnection(): Promise<void>;
    get connected(): boolean;
}
