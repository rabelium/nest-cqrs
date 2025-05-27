import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { EventBusExplorer } from './explorer';
import { EventBus } from './event-bus';
import { EVENT_HANDLER_METADATA } from '../decorators/event-handler.decorator';

describe('EventBusExplorer', () => {
  let explorer: EventBusExplorer;
  let discovery_service: jest.Mocked<DiscoveryService>;
  let metadata_scanner: jest.Mocked<MetadataScanner>;
  let reflector: jest.Mocked<Reflector>;
  let event_bus: jest.Mocked<EventBus>;

  beforeEach(async () => {
    const mock_discovery_service = {
      getProviders: jest.fn(),
      getControllers: jest.fn(),
    };

    const mock_metadata_scanner = {
      getAllMethodNames: jest.fn(),
    };

    const mock_reflector = {
      get: jest.fn(),
    };

    const mock_event_bus = {
      on: jest.fn(),
      emit: jest.fn(),
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventBusExplorer,
        { provide: DiscoveryService, useValue: mock_discovery_service },
        { provide: MetadataScanner, useValue: mock_metadata_scanner },
        { provide: Reflector, useValue: mock_reflector },
        { provide: EventBus, useValue: mock_event_bus },
      ],
    }).compile();

    explorer = module.get<EventBusExplorer>(EventBusExplorer);
    discovery_service = module.get(DiscoveryService);
    metadata_scanner = module.get(MetadataScanner);
    reflector = module.get(Reflector);
    event_bus = module.get(EventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should register event handlers from providers and controllers', async () => {
      // Create a proper class with method on prototype
      class TestProvider {
        async handleUserCreated(payload: any) {
          return 'handled';
        }
      }

      const mock_instance = new TestProvider();

      const mock_wrapper = {
        instance: mock_instance,
        metatype: TestProvider,
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue(['handleUserCreated']);
      reflector.get.mockReturnValue('user.created');

      explorer.onApplicationBootstrap();

      expect(discovery_service.getProviders).toHaveBeenCalled();
      expect(discovery_service.getControllers).toHaveBeenCalled();
      expect(metadata_scanner.getAllMethodNames).toHaveBeenCalledWith(
        Object.getPrototypeOf(mock_instance),
      );
      expect(reflector.get).toHaveBeenCalledWith(
        EVENT_HANDLER_METADATA,
        TestProvider.prototype.handleUserCreated,
      );
      expect(event_bus.on).toHaveBeenCalledWith('user.created', expect.any(Function));
    });

    it('should register event handlers from controllers', async () => {
      const mock_instance = {
        handleOrderProcessed: async (payload: any) => 'processed',
      };

      const mock_wrapper = {
        instance: mock_instance,
        metatype: class TestController {},
      };

      discovery_service.getProviders.mockReturnValue([]);
      discovery_service.getControllers.mockReturnValue([mock_wrapper] as any);

      metadata_scanner.getAllMethodNames.mockReturnValue(['handleOrderProcessed']);
      reflector.get.mockReturnValue('order.processed');

      explorer.onApplicationBootstrap();

      expect(event_bus.on).toHaveBeenCalledWith('order.processed', expect.any(Function));
    });

    it('should handle multiple event handlers in same class', async () => {
      const mock_instance = {
        handleUserCreated: async (payload: any) => 'user_handled',
        handleUserUpdated: async (payload: any) => 'user_updated',
        regularMethod: () => 'not_a_handler',
      };

      const mock_wrapper = {
        instance: mock_instance,
        metatype: class TestProvider {},
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue([
        'handleUserCreated',
        'handleUserUpdated',
        'regularMethod',
      ]);

      reflector.get
        .mockReturnValueOnce('user.created') // for handleUserCreated
        .mockReturnValueOnce('user.updated') // for handleUserUpdated
        .mockReturnValueOnce(undefined); // for regularMethod

      explorer.onApplicationBootstrap();

      expect(event_bus.on).toHaveBeenCalledTimes(2);
      expect(event_bus.on).toHaveBeenCalledWith('user.created', expect.any(Function));
      expect(event_bus.on).toHaveBeenCalledWith('user.updated', expect.any(Function));
    });

    it('should skip wrappers without instance', async () => {
      const mock_wrapper = {
        instance: null,
        metatype: class TestProvider {},
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      explorer.onApplicationBootstrap();

      expect(metadata_scanner.getAllMethodNames).not.toHaveBeenCalled();
      expect(event_bus.on).not.toHaveBeenCalled();
    });

    it('should skip wrappers without metatype', async () => {
      const mock_wrapper = {
        instance: {},
        metatype: null,
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      explorer.onApplicationBootstrap();

      expect(metadata_scanner.getAllMethodNames).not.toHaveBeenCalled();
      expect(event_bus.on).not.toHaveBeenCalled();
    });

    it('should skip methods without event handler metadata', async () => {
      const mock_instance = {
        regularMethod: () => 'not_a_handler',
        anotherMethod: () => 'also_not_a_handler',
      };

      const mock_wrapper = {
        instance: mock_instance,
        metatype: class TestProvider {},
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue(['regularMethod', 'anotherMethod']);
      reflector.get.mockReturnValue(undefined);

      explorer.onApplicationBootstrap();

      expect(reflector.get).toHaveBeenCalledTimes(2);
      expect(event_bus.on).not.toHaveBeenCalled();
    });

    it('should correctly bind handler method to instance when called', async () => {
      class TestProvider {
        test_property = 'instance_value';

        async handleEvent(payload: any) {
          return `${this.test_property}: ${payload.message}`;
        }
      }

      const mock_instance = new TestProvider();
      // Spy on the prototype method since that's what the explorer uses
      const spy = jest.spyOn(TestProvider.prototype, 'handleEvent');

      const mock_wrapper = {
        instance: mock_instance,
        metatype: TestProvider,
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue(['handleEvent']);
      reflector.get.mockReturnValue('test.event');

      explorer.onApplicationBootstrap();

      // Get the registered handler function
      const registered_handler = event_bus.on.mock.calls[0][1];

      // Call the handler with test payload
      const result = await registered_handler({ message: 'test' });

      expect(spy).toHaveBeenCalledWith({ message: 'test' });
      expect(result).toBe('instance_value: test');
    });

    it('should handle async and sync handlers', async () => {
      class TestProvider {
        async asyncHandler(payload: any) {
          return 'async_result';
        }

        syncHandler(payload: any) {
          return 'sync_result';
        }
      }

      const mock_instance = new TestProvider();
      const asyncSpy = jest.spyOn(TestProvider.prototype, 'asyncHandler');
      const syncSpy = jest.spyOn(TestProvider.prototype, 'syncHandler');

      const mock_wrapper = {
        instance: mock_instance,
        metatype: TestProvider,
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue(['asyncHandler', 'syncHandler']);
      reflector.get.mockReturnValueOnce('async.event').mockReturnValueOnce('sync.event');

      explorer.onApplicationBootstrap();

      expect(event_bus.on).toHaveBeenCalledTimes(2);

      // Test async handler
      const async_handler = event_bus.on.mock.calls[0][1];
      const async_result = await async_handler({ test: 'data' });
      expect(async_result).toBe('async_result');
      expect(asyncSpy).toHaveBeenCalledWith({ test: 'data' });

      // Test sync handler
      const sync_handler = event_bus.on.mock.calls[1][1];
      const sync_result = await sync_handler({ test: 'data' });
      expect(sync_result).toBe('sync_result');
      expect(syncSpy).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle handler errors gracefully', async () => {
      const test_error = new Error('Handler failed');

      class TestProvider {
        async faultyHandler(payload: any) {
          throw test_error;
        }
      }

      const mock_instance = new TestProvider();
      const spy = jest.spyOn(TestProvider.prototype, 'faultyHandler');

      const mock_wrapper = {
        instance: mock_instance,
        metatype: TestProvider,
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue(['faultyHandler']);
      reflector.get.mockReturnValue('faulty.event');

      explorer.onApplicationBootstrap();

      const registered_handler = event_bus.on.mock.calls[0][1];

      await expect(registered_handler({ test: 'data' })).rejects.toThrow(test_error);
      expect(spy).toHaveBeenCalledWith({ test: 'data' });
    });

    it('should handle empty providers and controllers lists', async () => {
      discovery_service.getProviders.mockReturnValue([]);
      discovery_service.getControllers.mockReturnValue([]);

      explorer.onApplicationBootstrap();

      expect(metadata_scanner.getAllMethodNames).not.toHaveBeenCalled();
      expect(reflector.get).not.toHaveBeenCalled();
      expect(event_bus.on).not.toHaveBeenCalled();
    });

    it('should handle providers and controllers with no methods', async () => {
      const mock_instance = {};
      const mock_wrapper = {
        instance: mock_instance,
        metatype: class EmptyProvider {},
      };

      discovery_service.getProviders.mockReturnValue([mock_wrapper] as any);
      discovery_service.getControllers.mockReturnValue([]);

      metadata_scanner.getAllMethodNames.mockReturnValue([]);

      explorer.onApplicationBootstrap();

      expect(reflector.get).not.toHaveBeenCalled();
      expect(event_bus.on).not.toHaveBeenCalled();
    });
  });
});
