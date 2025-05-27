import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { EventBus } from '.';
import { EVENT_HANDLER_METADATA } from '../decorators/event-handler.decorator';

@Injectable()
export class EventBusExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly eventBus: EventBus,
  ) {}

  onApplicationBootstrap() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();

    for (const wrapper of [...providers, ...controllers]) {
      const { instance, metatype } = wrapper;
      if (!instance || !metatype) continue;

      const prototype = Object.getPrototypeOf(instance);
      const methods = this.metadataScanner.getAllMethodNames(prototype);

      for (const methodName of methods) {
        const methodRef = prototype[methodName];
        const eventName = this.reflector.get<string>(EVENT_HANDLER_METADATA, methodRef);

        if (eventName) {
          this.eventBus.on(eventName, async payload => {
            return await methodRef.call(instance, payload);
          });
        }
      }
    }
  }
}
