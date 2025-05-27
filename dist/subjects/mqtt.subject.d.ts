import { Subject } from 'rxjs';
import { MqttOptions, Event } from '../interfaces';
type MqttClientType = import('mqtt').MqttClient;
type IClientOptionsType = import('mqtt').IClientOptions;
export declare class MqttSubject extends Subject<Event> {
    private readonly options;
    private readonly logger;
    private mqtt_client;
    private is_connected;
    private initialization_promise;
    private readonly topic_name;
    constructor(options: MqttOptions);
    private initialize;
    next(value: Event): void;
    private publishToMqtt;
    error(err: Error): void;
    complete(): void;
    waitForConnection(): Promise<void>;
    get connected(): boolean;
    get client(): MqttClientType | null;
    subscribeToTopic(topic: string, options?: IClientOptionsType): Promise<void>;
    unsubscribeFromTopic(topic: string): Promise<void>;
    publishToTopic(topic: string, message: string | Buffer, options?: IClientOptionsType): Promise<void>;
}
export {};
