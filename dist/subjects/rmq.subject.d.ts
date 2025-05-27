import { Subject } from 'rxjs';
import { Event, RmqOptions } from '../interfaces';
type ChannelModelType = import('amqplib').ChannelModel;
type ChannelType = import('amqplib').Channel;
type PublishOptionsType = import('amqplib').Options.Publish;
export declare class RmqSubject extends Subject<Event> {
    private readonly options;
    private readonly logger;
    private connection;
    private channel;
    private is_connected;
    private initialization_promise;
    private readonly queue_name;
    private readonly exchange_name;
    private readonly routing_key;
    private consumer_tag;
    constructor(options: RmqOptions);
    private initialize;
    private buildConnectionUrls;
    private startConsuming;
    next(value: Event): void;
    private publishToRabbitMQ;
    error(err: Error): void;
    complete(): void;
    /**
     * Wait for the RabbitMQ connection to be established
     */
    waitForConnection(): Promise<void>;
    /**
     * Check if the RabbitMQ connection is established
     */
    get connected(): boolean;
    /**
     * Get the underlying AMQP connection
     */
    get amqp_connection(): ChannelModelType | null;
    /**
     * Get the underlying AMQP channel
     */
    get amqp_channel(): ChannelType | null;
    /**
     * Publish a message to a specific exchange and routing key
     */
    publishToExchange(exchange: string, routing_key: string, message: string | object, options?: PublishOptionsType): Promise<void>;
    /**
     * Send a message directly to a queue
     */
    sendToQueue(queue: string, message: string | object, options?: PublishOptionsType): Promise<void>;
    /**
     * Bind a queue to an exchange with a routing key
     */
    bindQueue(queue: string, exchange: string, routing_key: string): Promise<void>;
    /**
     * Unbind a queue from an exchange
     */
    unbindQueue(queue: string, exchange: string, routing_key: string): Promise<void>;
    /**
     * Clean up resources and close connections
     */
    private cleanup;
}
export {};
