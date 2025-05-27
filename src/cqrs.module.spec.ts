import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { CqrsModule, CqrsModuleOptions } from './cqrs.module';
import { TransportType } from './enums';
import { EventBus, EventBusExplorer } from './event-bus';

// Mock the subject classes to avoid external dependencies
jest.mock('./subjects', () => ({
  RedisSubject: jest.fn().mockImplementation(() => ({ type: 'redis' })),
  NatsSubject: jest.fn().mockImplementation(() => ({ type: 'nats' })),
  MqttSubject: jest.fn().mockImplementation(() => ({ type: 'mqtt' })),
  RmqSubject: jest.fn().mockImplementation(() => ({ type: 'rmq' })),
  KafkaSubject: jest.fn().mockImplementation(() => ({ type: 'kafka' })),
}));

describe('CqrsModule', () => {
  describe('forRoot', () => {
    it('should create module with default configuration (event transport)', () => {
      const module = CqrsModule.forRoot();

      expect(module.module).toBe(CqrsModule);
      expect(module.imports).toHaveLength(0);
      expect(module.providers).toEqual(
        expect.arrayContaining([
          MetadataScanner,
          DiscoveryService,
          EventBus,
          EventBusExplorer,
          Reflector,
          expect.objectContaining({
            provide: 'SUBJECT',
            useFactory: expect.any(Function),
          }),
        ]),
      );
      expect(module.exports).toEqual([EventBus, EventBusExplorer]);
    });

    it('should create module with empty configuration', () => {
      const module = CqrsModule.forRoot({});

      expect(module.module).toBe(CqrsModule);
      expect(module.imports).toHaveLength(0);
    });

    it('should create module with event transport explicitly configured', () => {
      const configuration: CqrsModuleOptions = {
        transport: { type: 'event' as any },
      };

      const module = CqrsModule.forRoot(configuration);

      expect(module.imports).toHaveLength(0);
    });

    it('should create module with Redis transport', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.REDIS,
          host: 'localhost',
          port: 6379,
        },
      };

      const module = CqrsModule.forRoot(configuration);

      expect(module.imports).toEqual([]);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      expect(subject_provider).toBeDefined();
      expect(subject_provider.useFactory).toBeDefined();

      // Test the factory function
      const subject_instance = subject_provider.useFactory();
      expect(subject_instance).toEqual({ type: 'redis' });
    });

    it('should create module with NATS transport', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.NATS,
          servers: ['nats://localhost:4222'],
        },
      };

      const module = CqrsModule.forRoot(configuration);

      expect(module.imports).toEqual([]);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      const subject_instance = subject_provider.useFactory();
      expect(subject_instance).toEqual({ type: 'nats' });
    });

    it('should create module with MQTT transport', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.MQTT,
          url: 'mqtt://localhost:1883',
        },
      };

      const module = CqrsModule.forRoot(configuration);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      const subject_instance = subject_provider.useFactory();
      expect(subject_instance).toEqual({ type: 'mqtt' });
    });

    it('should create module with RabbitMQ transport', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.RMQ,
          urls: ['amqp://localhost:5672'],
          queue: 'test_queue',
        },
      };

      const module = CqrsModule.forRoot(configuration);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      const subject_instance = subject_provider.useFactory();
      expect(subject_instance).toEqual({ type: 'rmq' });
    });

    it('should create module with Kafka transport', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.KAFKA,
          client: {
            clientId: 'test-client',
            brokers: ['localhost:9092'],
          },
        },
      };

      const module = CqrsModule.forRoot(configuration);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      const subject_instance = subject_provider.useFactory();
      expect(subject_instance).toEqual({ type: 'kafka' });
    });

    it('should handle transport configuration with type property extracted', () => {
      const configuration: CqrsModuleOptions = {
        transport: {
          type: TransportType.REDIS,
          host: 'redis.example.com',
          port: 6380,
          password: 'secret',
          retryAttempts: 5,
        },
      };

      const module = CqrsModule.forRoot(configuration);

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      // The factory should receive options without the type property
      const { RedisSubject } = require('./subjects');
      subject_provider.useFactory();

      expect(RedisSubject).toHaveBeenCalledWith({
        host: 'redis.example.com',
        port: 6380,
        password: 'secret',
        retryAttempts: 5,
      });
    });

    it('should provide correct exports', () => {
      const module = CqrsModule.forRoot();

      expect(module.exports).toEqual([EventBus, EventBusExplorer]);
    });

    it('should include all required providers', () => {
      const module = CqrsModule.forRoot();

      const provider_types = (module.providers as any[]).map(provider =>
        typeof provider === 'function' ? provider : provider.provide || provider,
      );

      expect(provider_types).toContain(MetadataScanner);
      expect(provider_types).toContain(DiscoveryService);
      expect(provider_types).toContain(EventBus);
      expect(provider_types).toContain(EventBusExplorer);
      expect(provider_types).toContain(Reflector);
      expect(provider_types).toContain('SUBJECT');
    });

    it('should create different subject instances for different transport types', () => {
      const { RedisSubject, NatsSubject } = require('./subjects');

      // Clear previous calls
      RedisSubject.mockClear();
      NatsSubject.mockClear();

      const redis_module = CqrsModule.forRoot({
        transport: { type: TransportType.REDIS },
      });

      const nats_module = CqrsModule.forRoot({
        transport: { type: TransportType.NATS },
      });

      // Get and call the factory functions
      const redis_provider = redis_module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      const nats_provider = nats_module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      redis_provider.useFactory();
      nats_provider.useFactory();

      expect(RedisSubject).toHaveBeenCalledTimes(1);
      expect(NatsSubject).toHaveBeenCalledTimes(1);
    });

    it('should handle undefined transport gracefully', () => {
      const configuration: CqrsModuleOptions = {
        transport: undefined,
      };

      const module = CqrsModule.forRoot(configuration);

      expect(module.imports).toHaveLength(0);
    });
  });

  describe('factory function behavior', () => {
    beforeEach(() => {
      // Clear all mocks before each test
      jest.clearAllMocks();
    });

    it('should pass correct options to RedisSubject', () => {
      const { RedisSubject } = require('./subjects');

      const redis_options = {
        host: 'custom-host',
        port: 6380,
        password: 'secret',
        retryAttempts: 10,
      };

      const module = CqrsModule.forRoot({
        transport: {
          type: TransportType.REDIS,
          ...redis_options,
        },
      });

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      subject_provider.useFactory();

      expect(RedisSubject).toHaveBeenCalledWith(redis_options);
    });

    it('should pass correct options to KafkaSubject', () => {
      const { KafkaSubject } = require('./subjects');

      const kafka_options = {
        client: {
          clientId: 'test-app',
          brokers: ['broker1:9092', 'broker2:9092'],
        },
        consumer: {
          groupId: 'test-group',
        },
      };

      const module = CqrsModule.forRoot({
        transport: {
          type: TransportType.KAFKA,
          ...kafka_options,
        },
      });

      const subject_provider = module.providers?.find(
        (provider: any) => provider.provide === 'SUBJECT',
      ) as any;

      subject_provider.useFactory();

      expect(KafkaSubject).toHaveBeenCalledWith(kafka_options);
    });
  });
});
