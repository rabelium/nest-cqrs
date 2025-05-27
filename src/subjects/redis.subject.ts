import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

import { RedisOptions, Event } from '../interfaces';

type RedisType = typeof import('ioredis').default;
type RedisClientType = import('ioredis').Redis;
let Redis: RedisType | undefined;
try {
  Redis = require('ioredis');
} catch (error) {
  // ioredis is optional dependency
}
const dependency_error = new Error(
  'ioredis is required for RedisSubject. Please install it: npm install ioredis',
);

export class RedisSubject extends Subject<Event> {
  private readonly logger = new Logger(RedisSubject.name);
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private isConnected = false;
  private initialization_promise: Promise<void>;
  private readonly channel_name = 'cqrs:events';

  constructor(private readonly options: RedisOptions) {
    super();

    if (!Redis) {
      throw dependency_error;
    }

    this.initialization_promise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const redis_config = {
        host: this.options.host || 'localhost',
        port: this.options.port || 6379,
        retryDelayOnFailover: this.options.retryDelay || 100,
        maxRetriesPerRequest: this.options.retryAttempts || 3,
        connectTimeout: this.options.timeout || 10000,
        ...this.options,
      };
      if (!Redis) {
        throw dependency_error;
      }

      this.publisher = new Redis(redis_config);
      this.subscriber = new Redis(redis_config);

      this.subscriber.on('message', (_channel: string, message: string) => {
        try {
          const event: Event = JSON.parse(message);

          super.next(event);
        } catch (error) {
          this.logger.error('Failed to parse Redis message:', error);
          super.error(new Error(`Failed to parse Redis message: ${error}`));
        }
      });

      await this.subscriber.subscribe(this.channel_name);

      this.isConnected = true;
    } catch (error) {
      this.logger.error('Failed to initialize Redis subject:', error);
      super.error(error);
      throw error;
    }
  }

  next(value: Event): void {
    if (!this.isConnected) {
      this.initialization_promise
        .then(() => {
          this.publishToRedis(value);
        })
        .catch(error => {
          super.error(error);
        });
    } else {
      this.publishToRedis(value);
    }
  }

  private async publishToRedis(value: Event): Promise<void> {
    try {
      const message = JSON.stringify(value);
      if (!this.publisher) {
        throw dependency_error;
      }
      await this.publisher.publish(this.channel_name, message);
    } catch (error) {
      this.logger.error('Failed to publish message to Redis:', error);
      super.error(new Error(`Failed to publish to Redis: ${error}`));
    }
  }

  error(err: Error): void {
    const error_event: Event = {
      type: 'system_error',
      payload: err,
    };

    if (this.isConnected) {
      this.publishToRedis(error_event);
    }

    super.error(err);
  }

  complete(): void {
    if (this.publisher) {
      this.publisher.disconnect();
    }
    if (this.subscriber) {
      this.subscriber.disconnect();
    }
    super.complete();
  }

  async waitForConnection(): Promise<void> {
    await this.initialization_promise;
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
