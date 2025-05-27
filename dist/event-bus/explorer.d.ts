import { OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { EventBus } from '.';
export declare class EventBusExplorer implements OnApplicationBootstrap {
    private readonly discoveryService;
    private readonly metadataScanner;
    private readonly reflector;
    private readonly eventBus;
    constructor(discoveryService: DiscoveryService, metadataScanner: MetadataScanner, reflector: Reflector, eventBus: EventBus);
    onApplicationBootstrap(): void;
}
