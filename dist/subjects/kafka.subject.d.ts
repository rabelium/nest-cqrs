import { Subject } from 'rxjs';
import { Event, KafkaOptions } from '../interfaces';
export declare class KafkaSubject extends Subject<Event> {
    private readonly options;
    private readonly logger;
    private kafka_client;
    private producer;
    private consumer;
    private is_connected;
    private initialization_promise;
    private readonly topic_name;
    private readonly consumer_group_id;
    constructor(options: KafkaOptions);
    private initialize;
    private process_incoming_message;
    next(value: Event): void;
    private publish_to_kafka;
    error(err: Error): void;
    complete(): void;
    private disconnect;
    wait_for_connection(): Promise<void>;
    get connected(): boolean;
    get topic(): string;
    commit_offsets(): Promise<void>;
    pause(): void;
    resume(): void;
}
