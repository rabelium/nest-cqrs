import { TransportType } from '../enums';
import { BaseOptions } from './base-options.interface';
import {
  ConsumerConfig,
  ConsumerRunConfig,
  ConsumerSubscribeTopics,
  KafkaConfig,
  ProducerConfig,
  ProducerRecord,
} from '../external';

export interface KafkaOptions extends BaseOptions {
  type: TransportType.KAFKA;
  /**
   * Defaults to `"-server"` on server side and `"-client"` on client side.
   */
  postfixId?: string;
  client?: KafkaConfig;
  consumer?: ConsumerConfig;
  run?: Omit<ConsumerRunConfig, 'eachBatch' | 'eachMessage'>;
  subscribe?: Omit<ConsumerSubscribeTopics, 'topics'>;
  producer?: ProducerConfig;
  send?: Omit<ProducerRecord, 'topic' | 'messages'>;
  producerOnlyMode?: boolean;
}
