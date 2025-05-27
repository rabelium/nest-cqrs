import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

import { Event, NatsOptions } from '../interfaces';
import { NatsCodec } from '../external';

type NatsType = typeof import('nats');
type NatsConnectionType = import('nats').NatsConnection;
type NatsSubscriptionType = import('nats').Subscription;
type ConnectionOptionsType = import('nats').ConnectionOptions;
type MsgHdrsType = import('nats').MsgHdrs;
type ServerInfoType = import('nats').ServerInfo;
let nats: NatsType | undefined;
try {
  nats = require('nats');
} catch (error) {
  // nats is optional dependency
}
const dependency_error = new Error(
  'nats is required for NatsSubject. Please install it: npm install nats',
);

export class NatsSubject extends Subject<Event> {
  private readonly logger = new Logger(NatsSubject.name);
  private nats_connection: NatsConnectionType | null = null;
  private nats_subscription: NatsSubscriptionType | null = null;
  private is_connected = false;
  private initialization_promise: Promise<void>;
  private readonly subject_name = 'cqrs.events';
  private readonly codec: NatsCodec<Event>;

  constructor(private readonly options: NatsOptions) {
    super();

    if (!nats) {
      throw dependency_error;
    }

    this.codec = {
      encode: (event: Event): Uint8Array => {
        return new TextEncoder().encode(JSON.stringify(event));
      },
      decode: (data: Uint8Array): Event => {
        const json_string = new TextDecoder().decode(data);
        return JSON.parse(json_string);
      },
    };

    this.initialization_promise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const nats_config: Partial<ConnectionOptionsType> = {
        name: this.options.name,
        user: this.options.user,
        pass: this.options.pass,
        token: this.options.token,
        timeout: this.options.timeout || 10000,
        reconnect: this.options.reconnect !== false,
        maxReconnectAttempts: this.options.maxReconnectAttempts || -1,
        reconnectTimeWait: this.options.reconnectTimeWait || 2000,
        pedantic: this.options.pedantic || false,
        verbose: this.options.verbose || false,
        noEcho: this.options.noEcho || false,
        noRandomize: this.options.noRandomize || false,
        pingInterval: this.options.pingInterval || 120000,
        maxPingOut: this.options.maxPingOut || 2,
      };

      if (!nats) {
        throw dependency_error;
      }
      this.nats_connection = await nats.connect(nats_config);

      this.nats_subscription = this.nats_connection.subscribe(this.subject_name, {
        queue: this.options.queue,
      });

      this.processIncomingMessages();

      this.is_connected = true;
    } catch (error) {
      this.logger.error('Failed to initialize NATS subject:', error);
      super.error(error);
      throw error;
    }
  }

  private async processIncomingMessages(): Promise<void> {
    try {
      if (!this.nats_subscription) {
        throw dependency_error;
      }
      for await (const message of this.nats_subscription) {
        try {
          const event = this.codec.decode(message.data);

          super.next(event);
        } catch (error) {
          this.logger.error('Failed to parse NATS message:', error);
          super.error(new Error(`Failed to parse NATS message: ${error}`));
        }
      }
    } catch (error) {
      this.logger.error('Error processing NATS messages:', error);
      super.error(error);
    }
  }

  next(value: Event): void {
    if (!this.is_connected) {
      this.initialization_promise
        .then(() => {
          this.publishToNats(value);
        })
        .catch(error => {
          super.error(error);
        });
    } else {
      this.publishToNats(value);
    }
  }

  private publishToNats(value: Event): void {
    try {
      const encoded_data = this.codec.encode(value);
      if (!this.nats_connection) {
        throw dependency_error;
      }

      let headers: MsgHdrsType | undefined;
      if (this.options.headers && nats) {
        headers = nats.headers();
        Object.entries(this.options.headers).forEach(([key, value]) => {
          headers?.set(key, value);
        });
      }

      this.nats_connection.publish(this.subject_name, encoded_data, {
        headers,
      });
    } catch (error) {
      this.logger.error('Failed to publish message to NATS:', error);
      super.error(new Error(`Failed to publish to NATS: ${error}`));
    }
  }

  error(err: Error): void {
    const error_event: Event = {
      type: 'system_error',
      payload: err instanceof Error ? err.message : err,
    };

    if (this.is_connected) {
      this.publishToNats(error_event);
    }

    super.error(err);
  }

  complete(): void {
    if (this.nats_subscription) {
      this.nats_subscription.unsubscribe();
    }
    if (this.nats_connection) {
      this.nats_connection.close();
    }
    super.complete();
  }

  async waitForConnection(): Promise<void> {
    await this.initialization_promise;
  }

  get connected(): boolean {
    return this.is_connected;
  }

  get connectionInfo(): ServerInfoType | undefined {
    return this.nats_connection?.info;
  }

  async flush(): Promise<void> {
    if (this.nats_connection) {
      await this.nats_connection.flush();
    }
  }
}
