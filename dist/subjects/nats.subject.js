"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NatsSubject = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let nats;
try {
    nats = require('nats');
}
catch (error) {
    // nats is optional dependency
}
const dependency_error = new Error('nats is required for NatsSubject. Please install it: npm install nats');
class NatsSubject extends rxjs_1.Subject {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new common_1.Logger(NatsSubject.name);
        this.nats_connection = null;
        this.nats_subscription = null;
        this.is_connected = false;
        this.subject_name = 'cqrs.events';
        if (!nats) {
            throw dependency_error;
        }
        this.codec = {
            encode: (event) => {
                return new TextEncoder().encode(JSON.stringify(event));
            },
            decode: (data) => {
                const json_string = new TextDecoder().decode(data);
                return JSON.parse(json_string);
            },
        };
        this.initialization_promise = this.initialize();
    }
    async initialize() {
        try {
            const nats_config = {
                name: this.options.name,
                user: this.options.user,
                pass: this.options.pass,
                token: this.options.token,
                timeout: this.options.timeout || 10000,
                reconnect: this.options.reconnect !== false,
                maxReconnectAttempts: this.options.maxReconnectAttempts || -1,
                reconnectTimeWait: this.options.reconnectTimeWait || 2000,
                pedantic: this.options.pedantic || false,
                verbose: this.options.verbose || false,
                noEcho: this.options.noEcho || false,
                noRandomize: this.options.noRandomize || false,
                pingInterval: this.options.pingInterval || 120000,
                maxPingOut: this.options.maxPingOut || 2,
            };
            if (!nats) {
                throw dependency_error;
            }
            this.nats_connection = await nats.connect(nats_config);
            this.nats_subscription = this.nats_connection.subscribe(this.subject_name, {
                queue: this.options.queue,
            });
            this.processIncomingMessages();
            this.is_connected = true;
        }
        catch (error) {
            this.logger.error('Failed to initialize NATS subject:', error);
            super.error(error);
            throw error;
        }
    }
    async processIncomingMessages() {
        try {
            if (!this.nats_subscription) {
                throw dependency_error;
            }
            for await (const message of this.nats_subscription) {
                try {
                    const event = this.codec.decode(message.data);
                    super.next(event);
                }
                catch (error) {
                    this.logger.error('Failed to parse NATS message:', error);
                    super.error(new Error(`Failed to parse NATS message: ${error}`));
                }
            }
        }
        catch (error) {
            this.logger.error('Error processing NATS messages:', error);
            super.error(error);
        }
    }
    next(value) {
        if (!this.is_connected) {
            this.initialization_promise
                .then(() => {
                this.publishToNats(value);
            })
                .catch(error => {
                super.error(error);
            });
        }
        else {
            this.publishToNats(value);
        }
    }
    publishToNats(value) {
        try {
            const encoded_data = this.codec.encode(value);
            if (!this.nats_connection) {
                throw dependency_error;
            }
            this.nats_connection.publish(this.subject_name, encoded_data, {
                headers: this.options.headers,
            });
        }
        catch (error) {
            this.logger.error('Failed to publish message to NATS:', error);
            super.error(new Error(`Failed to publish to NATS: ${error}`));
        }
    }
    error(err) {
        const error_event = {
            type: 'system_error',
            payload: err instanceof Error ? err.message : err,
        };
        if (this.is_connected) {
            this.publishToNats(error_event);
        }
        super.error(err);
    }
    complete() {
        if (this.nats_subscription) {
            this.nats_subscription.unsubscribe();
        }
        if (this.nats_connection) {
            this.nats_connection.close();
        }
        super.complete();
    }
    async waitForConnection() {
        await this.initialization_promise;
    }
    get connected() {
        return this.is_connected;
    }
    get connectionInfo() {
        return this.nats_connection?.info;
    }
    async flush() {
        if (this.nats_connection) {
            await this.nats_connection.flush();
        }
    }
}
exports.NatsSubject = NatsSubject;
