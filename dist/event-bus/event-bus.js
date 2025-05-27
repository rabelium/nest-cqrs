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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBus = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const rxjs_1 = require("rxjs");
let EventBus = class EventBus {
    constructor(event$) {
        this.event$ = event$;
        if (!event$) {
            this.event$ = new rxjs_1.Subject();
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(type, handler) {
        this.event$.pipe((0, rxjs_1.filter)(e => e.type === type)).subscribe(async (event) => {
            try {
                const result = await handler(event.payload);
                if (event.correlationId) {
                    this.event$.next({
                        type: `${type}_response`,
                        payload: result,
                        correlationId: event.correlationId,
                    });
                }
            }
            catch (err) {
                if (event.correlationId) {
                    this.event$.next({
                        type: `${type}_error`,
                        payload: err,
                        correlationId: event.correlationId,
                    });
                }
            }
        });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit(type, payload) {
        this.event$.next({ type, payload });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async execute(type, payload) {
        const correlationId = (0, crypto_1.randomUUID)();
        this.event$.next({ type, payload, correlationId });
        const response = await (0, rxjs_1.firstValueFrom)(this.event$.pipe((0, rxjs_1.filter)(e => (e.type === `${type}_response` || e.type === `${type}_error`) &&
            e.correlationId === correlationId)));
        if (response.type === `${type}_error`) {
            if (response.payload instanceof Error) {
                throw response.payload;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const errorPayload = response.payload;
            throw new common_1.HttpException(errorPayload.message, errorPayload.status);
        }
        return response.payload;
    }
};
exports.EventBus = EventBus;
exports.EventBus = EventBus = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)('SUBJECT')),
    __metadata("design:paramtypes", [rxjs_1.Subject])
], EventBus);
