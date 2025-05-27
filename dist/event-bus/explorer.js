"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBusExplorer = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const _1 = require(".");
const event_handler_decorator_1 = require("../decorators/event-handler.decorator");
let EventBusExplorer = class EventBusExplorer {
    constructor(discoveryService, metadataScanner, reflector, eventBus) {
        this.discoveryService = discoveryService;
        this.metadataScanner = metadataScanner;
        this.reflector = reflector;
        this.eventBus = eventBus;
    }
    onApplicationBootstrap() {
        const providers = this.discoveryService.getProviders();
        const controllers = this.discoveryService.getControllers();
        for (const wrapper of [...providers, ...controllers]) {
            const { instance, metatype } = wrapper;
            if (!instance || !metatype)
                continue;
            const prototype = Object.getPrototypeOf(instance);
            const methods = this.metadataScanner.getAllMethodNames(prototype);
            for (const methodName of methods) {
                const methodRef = prototype[methodName];
                const eventName = this.reflector.get(event_handler_decorator_1.EVENT_HANDLER_METADATA, methodRef);
                if (eventName) {
                    this.eventBus.on(eventName, async (payload) => {
                        return await methodRef.call(instance, payload);
                    });
                }
            }
        }
    }
};
exports.EventBusExplorer = EventBusExplorer;
exports.EventBusExplorer = EventBusExplorer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.DiscoveryService,
        core_1.MetadataScanner,
        core_1.Reflector,
        _1.EventBus])
], EventBusExplorer);
