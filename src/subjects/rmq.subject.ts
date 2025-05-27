import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Event, RmqOptions } from '../interfaces';

type AmqpType = typeof import('amqplib');
type ChannelModelType = import('amqplib').ChannelModel;
type ChannelType = import('amqplib').Channel;
type ConsumeMessageType = import('amqplib').ConsumeMessage;
type PublishOptionsType = import('amqplib').Options.Publish;
let amqp: AmqpType | undefined;
try {
  amqp = require('amqplib');
} catch (error) {
  // amqplib is optional dependency
}
const dependency_error = new Error(
  'amqplib is required for RmqSubject. Please install it: npm install amqplib',
);

export class RmqSubject extends Subject<Event> {
  private readonly logger = new Logger(RmqSubject.name);
  private connection: ChannelModelType | null = null;
  private channel: ChannelType | null = null;
  private is_connected = false;
  private initialization_promise: Promise<void>;
  private readonly queue_name: string;
  private readonly exchange_name: string;
  private readonly routing_key: string;
  private consumer_tag: string | null = null;

  constructor(private readonly options: RmqOptions) {
    super();

    if (!amqp) {
      throw dependency_error;
    }

    this.queue_name = this.options.queue || 'cqrs.events';
    this.exchange_name = this.options.exchange || '';
    this.routing_key = this.options.routingKey || this.queue_name;

    this.initialization_promise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const connection_urls = this.buildConnectionUrls();
      if (!amqp) {
        throw dependency_error;
      }

      this.connection = await amqp.connect(connection_urls, this.options.socketOptions);

      this.connection.on('error', (error: Error) => {
        this.logger.error('RabbitMQ connection error:', error);
        this.is_connected = false;
        super.error(error);
      });

      this.connection.on('close', () => {
        this.is_connected = false;
      });

      this.channel = await this.connection.createChannel();

      this.channel.on('error', (error: Error) => {
        this.logger.error('RabbitMQ channel error:', error);
        super.error(error);
      });

      this.channel.on('close', () => {});

      if (this.options.prefetchCount !== undefined) {
        await this.channel.prefetch(
          this.options.prefetchCount,
          this.options.isGlobalPrefetchCount || false,
        );
      }

      if (this.exchange_name) {
        await this.channel.assertExchange(
          this.exchange_name,
          this.options.exchangeType || 'topic',
          {
            durable: this.options.queueOptions?.durable !== false,
            autoDelete: this.options.queueOptions?.autoDelete || false,
            arguments: this.options.exchangeArguments || {},
          },
        );
      }

      if (!this.options.noAssert) {
        await this.channel.assertQueue(this.queue_name, {
          durable: this.options.queueOptions?.durable !== false,
          autoDelete: this.options.queueOptions?.autoDelete || false,
          arguments: this.options.queueOptions?.arguments || {},
          messageTtl: this.options.queueOptions?.messageTtl,
          expires: this.options.queueOptions?.expires,
          deadLetterExchange: this.options.queueOptions?.deadLetterExchange,
          deadLetterRoutingKey: this.options.queueOptions?.deadLetterRoutingKey,
          maxLength: this.options.queueOptions?.maxLength,
          maxPriority: this.options.queueOptions?.maxPriority,
        });

        if (this.exchange_name) {
          await this.channel.bindQueue(this.queue_name, this.exchange_name, this.routing_key);
        }
      }

      await this.startConsuming();

      this.is_connected = true;
    } catch (error) {
      this.logger.error('Failed to initialize RabbitMQ subject:', error);
      super.error(error);
      throw error;
    }
  }

  private buildConnectionUrls(): string {
    if (this.options.urls && this.options.urls.length > 0) {
      const urls = this.options.urls.map(url => {
        if (typeof url === 'string') {
          return url;
        }

        const protocol = url.protocol || 'amqp';
        const hostname = url.hostname || 'localhost';
        const port = url.port || 5672;
        const username = url.username ? `${url.username}:${url.password || ''}@` : '';
        const vhost = url.vhost ? `/${url.vhost}` : '';

        return `${protocol}://${username}${hostname}:${port}${vhost}`;
      });

      return urls[0];
    }

    // Default connection URL when no URLs are provided
    return 'amqp://localhost:5672';
  }

  private async startConsuming(): Promise<void> {
    try {
      if (!this.channel) {
        throw dependency_error;
      }
      const consume_result = await this.channel.consume(
        this.queue_name,
        (message: ConsumeMessageType | null) => {
          if (message) {
            try {
              const content = message.content.toString();
              const event: Event = JSON.parse(content);

              super.next(event);

              if (!this.options.noAck) {
                if (!this.channel) {
                  throw dependency_error;
                }
                this.channel.ack(message);
              }
            } catch (error) {
              this.logger.error('Failed to parse RabbitMQ message:', error);

              if (!this.options.noAck) {
                if (!this.channel) {
                  throw dependency_error;
                }
                this.channel.nack(message, false, false);
              }

              super.error(new Error(`Failed to parse RabbitMQ message: ${error}`));
            }
          }
        },
        {
          noAck: this.options.noAck || false,
          consumerTag: this.options.consumerTag,
        },
      );

      this.consumer_tag = consume_result.consumerTag;
    } catch (error) {
      this.logger.error('Failed to start consuming messages:', error);
      throw error;
    }
  }

  next(value: Event): void {
    if (!this.is_connected) {
      this.initialization_promise
        .then(() => {
          this.publishToRabbitMQ(value);
        })
        .catch(error => {
          super.error(error);
        });
    } else {
      this.publishToRabbitMQ(value);
    }
  }

  private publishToRabbitMQ(value: Event): void {
    try {
      const message = JSON.stringify(value);
      const publish_options = {
        persistent: this.options.persistent !== false,
        headers: this.options.headers || {},
        timestamp: Date.now(),
      };
      if (!this.channel) {
        throw dependency_error;
      }

      if (this.exchange_name) {
        const routing_key = this.options.wildcards
          ? value.type.replace(/\./g, '.')
          : this.routing_key;

        this.channel.publish(
          this.exchange_name,
          routing_key,
          Buffer.from(message),
          publish_options,
        );
      } else {
        this.channel.sendToQueue(this.queue_name, Buffer.from(message), publish_options);
      }
    } catch (error) {
      this.logger.error('Failed to publish message to RabbitMQ:', error);
      super.error(new Error(`Failed to publish to RabbitMQ: ${error}`));
    }
  }

  error(err: Error): void {
    const error_event: Event = {
      type: 'system_error',
      payload: err instanceof Error ? err.message : err,
    };

    if (this.is_connected) {
      this.publishToRabbitMQ(error_event);
    }

    super.error(err);
  }

  complete(): void {
    this.cleanup()
      .then(() => {
        super.complete();
      })
      .catch(error => {
        this.logger.error('Error during cleanup:', error);
        super.complete();
      });
  }

  /**
   * Wait for the RabbitMQ connection to be established
   */
  async waitForConnection(): Promise<void> {
    await this.initialization_promise;

    const timeout = this.options.timeout || 30000;
    const start_time = Date.now();

    while (!this.is_connected && Date.now() - start_time < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!this.is_connected) {
      throw new Error(`Failed to connect to RabbitMQ within ${timeout}ms`);
    }
  }

  /**
   * Check if the RabbitMQ connection is established
   */
  get connected(): boolean {
    return this.is_connected;
  }

  /**
   * Get the underlying AMQP connection
   */
  get amqp_connection(): ChannelModelType | null {
    return this.connection;
  }

  /**
   * Get the underlying AMQP channel
   */
  get amqp_channel(): ChannelType | null {
    return this.channel;
  }

  /**
   * Publish a message to a specific exchange and routing key
   */
  async publishToExchange(
    exchange: string,
    routing_key: string,
    message: string | object,
    options?: PublishOptionsType,
  ): Promise<void> {
    await this.waitForConnection();

    const content = typeof message === 'string' ? message : JSON.stringify(message);
    const publish_options = {
      persistent: this.options.persistent !== false,
      ...options,
    };

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        throw dependency_error;
      }
      try {
        const result = this.channel.publish(
          exchange,
          routing_key,
          Buffer.from(content),
          publish_options,
        );

        if (result) {
          resolve();
        } else {
          this.channel.once('drain', () => resolve());
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send a message directly to a queue
   */
  async sendToQueue(
    queue: string,
    message: string | object,
    options?: PublishOptionsType,
  ): Promise<void> {
    await this.waitForConnection();

    const content = typeof message === 'string' ? message : JSON.stringify(message);
    const send_options = {
      persistent: this.options.persistent !== false,
      ...options,
    };

    return new Promise((resolve, reject) => {
      if (!this.channel) {
        throw dependency_error;
      }
      try {
        const result = this.channel.sendToQueue(queue, Buffer.from(content), send_options);

        if (result) {
          resolve();
        } else {
          this.channel.once('drain', () => resolve());
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Bind a queue to an exchange with a routing key
   */
  async bindQueue(queue: string, exchange: string, routing_key: string): Promise<void> {
    if (!this.channel) {
      throw dependency_error;
    }
    await this.waitForConnection();
    await this.channel.bindQueue(queue, exchange, routing_key);
  }

  /**
   * Unbind a queue from an exchange
   */
  async unbindQueue(queue: string, exchange: string, routing_key: string): Promise<void> {
    if (!this.channel) {
      throw dependency_error;
    }
    await this.waitForConnection();
    await this.channel.unbindQueue(queue, exchange, routing_key);
  }

  /**
   * Clean up resources and close connections
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.consumer_tag && this.channel) {
        await this.channel.cancel(this.consumer_tag);
      }

      if (this.channel) {
        await this.channel.close();
      }

      if (this.connection) {
        await this.connection.close();
      }

      this.is_connected = false;
    } catch (error) {
      this.logger.error('Error during RabbitMQ cleanup:', error);
    }
  }
}
