import { RmqOptions } from './rmq-options.interface';
import { KafkaOptions } from './kafka-options.interface';
import { MqttOptions } from './mqtt-options.interface';
import { NatsOptions } from './nats-options.interface';
import { RedisOptions } from './redis-options.interface';
export type TransportConfig = RmqOptions | KafkaOptions | RedisOptions | MqttOptions | NatsOptions;
