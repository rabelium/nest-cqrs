"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var CqrsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CqrsModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const enums_1 = require("./enums");
const eventServices = __importStar(require("./event-bus"));
const subjects_1 = require("./subjects");
const rxjs_1 = require("rxjs");
let CqrsModule = CqrsModule_1 = class CqrsModule {
    static forRoot(configuration = {}) {
        const { type, ...options } = configuration.transport || { type: 'event' };
        const providers = [
            core_1.MetadataScanner,
            core_1.DiscoveryService,
            ...Object.values(eventServices),
            core_1.Reflector,
        ];
        const transport = {
            provide: 'SUBJECT',
            useFactory: () => {
                switch (type) {
                    case enums_1.TransportType.REDIS:
                        return new subjects_1.RedisSubject(options);
                    case enums_1.TransportType.NATS:
                        return new subjects_1.NatsSubject(options);
                    case enums_1.TransportType.MQTT:
                        return new subjects_1.MqttSubject(options);
                    case enums_1.TransportType.RMQ:
                        return new subjects_1.RmqSubject(options);
                    case enums_1.TransportType.KAFKA:
                        return new subjects_1.KafkaSubject(options);
                    default:
                        return new rxjs_1.Subject();
                }
            },
        };
        providers.push(transport);
        return {
            module: CqrsModule_1,
            imports: [],
            providers,
            exports: [...Object.values(eventServices)],
        };
    }
};
exports.CqrsModule = CqrsModule;
exports.CqrsModule = CqrsModule = CqrsModule_1 = __decorate([
    (0, common_1.Module)({})
], CqrsModule);
