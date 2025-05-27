import { Subject } from 'rxjs';
import { Event, NatsOptions } from '../interfaces';
type ServerInfoType = import('nats').ServerInfo;
export declare class NatsSubject extends Subject<Event> {
    private readonly options;
    private readonly logger;
    private nats_connection;
    private nats_subscription;
    private is_connected;
    private initialization_promise;
    private readonly subject_name;
    private readonly codec;
    constructor(options: NatsOptions);
    private initialize;
    private processIncomingMessages;
    next(value: Event): void;
    private publishToNats;
    error(err: Error): void;
    complete(): void;
    waitForConnection(): Promise<void>;
    get connected(): boolean;
    get connectionInfo(): ServerInfoType | undefined;
    flush(): Promise<void>;
}
export {};
