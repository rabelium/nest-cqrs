import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Event, KafkaOptions } from '../interfaces';
import { Kafka, Producer, Consumer, KafkaMessage } from '../external';

type KafkaType = typeof import('kafkajs');
let kafkajs: KafkaType | undefined;
try {
  kafkajs = require('kafkajs');
} catch (error) {
  // kafkajs is optional dependency
}
const dependency_error = new Error(
  'kafkajs is required for KafkaSubject. Please install it: npm install kafkajs',
);

export class KafkaSubject extends Subject<Event> {
  private readonly logger = new Logger(KafkaSubject.name);
  private kafka_client: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private is_connected = false;
  private initialization_promise: Promise<void>;
  private readonly topic_name: string;
  private readonly consumer_group_id: string;

  constructor(private readonly options: KafkaOptions) {
    super();

    if (!kafkajs) {
      throw dependency_error;
    }

    this.topic_name = 'cqrs-events';
    this.consumer_group_id = options.consumer?.groupId || 'cqrs-consumer-group';

    this.initialization_promise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      if (!kafkajs) {
        throw dependency_error;
      }

      this.kafka_client = new kafkajs.Kafka({
        clientId: this.options.client?.clientId || 'cqrs-kafka-client',
        brokers: this.options.client?.brokers || ['localhost:9092'],
        ...this.options.client,
      });

      if (!this.kafka_client) {
        throw new Error('Failed to create Kafka client');
      }

      this.producer = this.kafka_client.producer({
        ...this.options.producer,
      });

      if (!this.options.producerOnlyMode) {
        this.consumer = this.kafka_client.consumer({
          groupId: this.consumer_group_id,
          ...this.options.consumer,
        });
      }

      await this.producer.connect();

      if (this.consumer) {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topics: [this.topic_name],
          fromBeginning: this.options.subscribe?.fromBeginning || false,
          ...this.options.subscribe,
        });

        await this.consumer.run({
          autoCommit: true,
          eachMessage: async ({ message }) => {
            await this.process_incoming_message(message);
          },
          ...this.options.run,
        });
      }

      this.is_connected = true;
    } catch (error) {
      this.logger.error('Failed to initialize Kafka subject:', error);
      super.error(error);
      throw error;
    }
  }

  private async process_incoming_message(message: KafkaMessage): Promise<void> {
    try {
      if (!message.value) {
        return;
      }

      const event_data = message.value.toString();
      const event: Event = JSON.parse(event_data);

      super.next(event);
    } catch (error) {
      this.logger.error('Failed to parse Kafka message:', error);
      super.error(new Error(`Failed to parse Kafka message: ${error}`));
    }
  }

  next(value: Event): void {
    if (!this.is_connected) {
      this.initialization_promise
        .then(() => {
          this.publish_to_kafka(value);
        })
        .catch(error => {
          super.error(error);
        });
    } else {
      this.publish_to_kafka(value);
    }
  }

  private async publish_to_kafka(value: Event): Promise<void> {
    try {
      if (!this.producer) {
        throw new Error('Producer not initialized');
      }

      const message_data = JSON.stringify(value);

      await this.producer.send({
        topic: this.topic_name,
        messages: [
          {
            key: value.correlationId || value.type,
            value: message_data,
            headers: {
              'event-type': value.type,
              'correlation-id': value.correlationId || '',
            },
          },
        ],
        ...this.options.send,
      });
    } catch (error) {
      this.logger.error('Failed to publish message to Kafka:', error);
      super.error(new Error(`Failed to publish to Kafka: ${error}`));
    }
  }

  error(err: Error): void {
    const error_event: Event = {
      type: 'system_error',
      payload: err instanceof Error ? err.message : err,
    };

    if (this.is_connected) {
      this.publish_to_kafka(error_event);
    }

    super.error(err);
  }

  complete(): void {
    this.disconnect().finally(() => {
      super.complete();
    });
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
      }
      if (this.producer) {
        await this.producer.disconnect();
      }
    } catch (error) {
      this.logger.error('Error disconnecting from Kafka:', error);
    }
  }

  async wait_for_connection(): Promise<void> {
    await this.initialization_promise;
  }

  get connected(): boolean {
    return this.is_connected;
  }

  get topic(): string {
    return this.topic_name;
  }

  async commit_offsets(): Promise<void> {
    if (this.consumer) {
      await this.consumer.commitOffsets([]);
    }
  }

  pause(): void {
    if (this.consumer) {
      this.consumer.pause([{ topic: this.topic_name }]);
    }
  }

  resume(): void {
    if (this.consumer) {
      this.consumer.resume([{ topic: this.topic_name }]);
    }
  }
}
