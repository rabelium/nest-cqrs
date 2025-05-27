import { TransportType } from '../enums';
import { BaseOptions } from './base-options.interface';
import { AmqpConnectionManagerSocketOptions, AmqplibQueueOptions, RmqUrl } from '../external';
export interface RmqOptions extends BaseOptions {
    type: TransportType.RMQ;
    /**
     * An array of connection URLs to try in order.
     */
    urls?: string[] | RmqUrl[];
    /**
     * The name of the queue.
     */
    queue?: string;
    /**
     * A prefetch count for this channel. The count given is the maximum number of messages sent over the channel that can be awaiting acknowledgement;
     * once there are count messages outstanding, the server will not send more messages on this channel until one or more have been acknowledged.
     */
    prefetchCount?: number;
    /**
     * Sets the per-channel behavior for prefetching messages.
     */
    isGlobalPrefetchCount?: boolean;
    /**
     * Amqplib queue options.
     * @see https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue
     */
    queueOptions?: AmqplibQueueOptions;
    /**
     * AMQP Connection Manager socket options.
     */
    socketOptions?: AmqpConnectionManagerSocketOptions;
    /**
     * If true, the broker won't expect an acknowledgement of messages delivered to this consumer; i.e., it will dequeue messages as soon as they've been sent down the wire.
     * @default false
     */
    noAck?: boolean;
    /**
     * A name which the server will use to distinguish message deliveries for the consumer; mustn't be already in use on the channel. It's usually easier to omit this, in which case the server will create a random name and supply it in the reply.
     */
    consumerTag?: string;
    /**
     * A reply queue for the producer.
     * @default 'amq.rabbitmq.reply-to'
     */
    replyQueue?: string;
    /**
     * If truthy, the message will survive broker restarts provided it's in a queue that also survives restarts.
     */
    persistent?: boolean;
    /**
     * Additional headers to be sent with every message.
     * Applies only to the producer configuration.
     */
    headers?: Record<string, string>;
    /**
     * When false, a queue will not be asserted before consuming.
     * @default false
     */
    noAssert?: boolean;
    /**
     * Name for the exchange. Defaults to the queue name when "wildcards" is set to true.
     * @default ''
     */
    exchange?: string;
    /**
     * Type of the exchange.
     * Accepts the AMQP standard types ('direct', 'fanout', 'topic', 'headers') or any custom exchange type name provided as a string literal.
     * @default 'topic'
     */
    exchangeType?: 'direct' | 'fanout' | 'topic' | 'headers' | (string & {});
    /**
     * Exchange arguments
     */
    exchangeArguments?: Record<string, string>;
    /**
     * Additional routing key for the topic exchange.
     */
    routingKey?: string;
    /**
     * Set to true only if you want to use Topic Exchange for routing messages to queues.
     * Enabling this will allow you to use wildcards (*, #) as message and event patterns.
     * @see https://www.rabbitmq.com/tutorials/tutorial-five-python#topic-exchange
     * @default false
     */
    wildcards?: boolean;
    /**
     * Maximum number of connection attempts.
     * Applies only to the consumer configuration.
     * -1 === infinite
     * @default -1
     */
    maxConnectionAttempts?: number;
}
