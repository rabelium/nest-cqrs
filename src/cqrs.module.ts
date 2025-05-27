import { Module, DynamicModule, Provider } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';

import { TransportType } from './enums';
import * as eventServices from './event-bus';
import { RedisSubject, NatsSubject, MqttSubject, RmqSubject, KafkaSubject } from './subjects';
import {
  TransportConfig,
  RedisOptions,
  MqttOptions,
  NatsOptions,
  RmqOptions,
  KafkaOptions,
} from './interfaces';
import { Subject } from 'rxjs';

export interface CqrsModuleOptions {
  transport?: TransportConfig;
}

@Module({})
export class CqrsModule {
  static forRoot(configuration: CqrsModuleOptions = {}): DynamicModule {
    const { type, ...options } = configuration.transport || { type: 'event' };

    const providers: Provider[] = [
      MetadataScanner,
      DiscoveryService,
      ...Object.values(eventServices),
      Reflector,
    ];

    const transport: Provider = {
      provide: 'SUBJECT',
      useFactory: () => {
        switch (type) {
          case TransportType.REDIS:
            return new RedisSubject(options as RedisOptions);
          case TransportType.NATS:
            return new NatsSubject(options as NatsOptions);
          case TransportType.MQTT:
            return new MqttSubject(options as MqttOptions);
          case TransportType.RMQ:
            return new RmqSubject(options as RmqOptions);
          case TransportType.KAFKA:
            return new KafkaSubject(options as KafkaOptions);
          default:
            return new Subject<Event>();
        }
      },
    };

    providers.push(transport);

    return {
      module: CqrsModule,
      imports: [],
      providers,
      exports: [...Object.values(eventServices)],
    };
  }
}
