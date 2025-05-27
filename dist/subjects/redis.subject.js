"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSubject = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let Redis;
try {
    Redis = require('ioredis');
}
catch (error) {
    // ioredis is optional dependency
}
const dependency_error = new Error('ioredis is required for RedisSubject. Please install it: npm install ioredis');
class RedisSubject extends rxjs_1.Subject {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new common_1.Logger(RedisSubject.name);
        this.publisher = null;
        this.subscriber = null;
        this.isConnected = false;
        this.channel_name = 'cqrs:events';
        if (!Redis) {
            throw dependency_error;
        }
        this.initialization_promise = this.initialize();
    }
    async initialize() {
        try {
            const redis_config = {
                host: this.options.host || 'localhost',
                port: this.options.port || 6379,
                retryDelayOnFailover: this.options.retryDelay || 100,
                maxRetriesPerRequest: this.options.retryAttempts || 3,
                connectTimeout: this.options.timeout || 10000,
                ...this.options,
            };
            if (!Redis) {
                throw dependency_error;
            }
            this.publisher = new Redis(redis_config);
            this.subscriber = new Redis(redis_config);
            this.subscriber.on('message', (_channel, message) => {
                try {
                    const event = JSON.parse(message);
                    super.next(event);
                }
                catch (error) {
                    this.logger.error('Failed to parse Redis message:', error);
                    super.error(new Error(`Failed to parse Redis message: ${error}`));
                }
            });
            await this.subscriber.subscribe(this.channel_name);
            this.isConnected = true;
        }
        catch (error) {
            this.logger.error('Failed to initialize Redis subject:', error);
            super.error(error);
            throw error;
        }
    }
    next(value) {
        if (!this.isConnected) {
            this.initialization_promise
                .then(() => {
                this.publishToRedis(value);
            })
                .catch(error => {
                super.error(error);
            });
        }
        else {
            this.publishToRedis(value);
        }
    }
    async publishToRedis(value) {
        try {
            const message = JSON.stringify(value);
            if (!this.publisher) {
                throw dependency_error;
            }
            await this.publisher.publish(this.channel_name, message);
        }
        catch (error) {
            this.logger.error('Failed to publish message to Redis:', error);
            super.error(new Error(`Failed to publish to Redis: ${error}`));
        }
    }
    error(err) {
        const error_event = {
            type: 'system_error',
            payload: err,
        };
        if (this.isConnected) {
            this.publishToRedis(error_event);
        }
        super.error(err);
    }
    complete() {
        if (this.publisher) {
            this.publisher.disconnect();
        }
        if (this.subscriber) {
            this.subscriber.disconnect();
        }
        super.complete();
    }
    async waitForConnection() {
        await this.initialization_promise;
    }
    get connected() {
        return this.isConnected;
    }
}
exports.RedisSubject = RedisSubject;
