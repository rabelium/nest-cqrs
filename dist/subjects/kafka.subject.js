"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaSubject = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let kafkajs;
try {
    kafkajs = require('kafkajs');
}
catch (error) {
    // kafkajs is optional dependency
}
const dependency_error = new Error('kafkajs is required for KafkaSubject. Please install it: npm install kafkajs');
class KafkaSubject extends rxjs_1.Subject {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new common_1.Logger(KafkaSubject.name);
        this.kafka_client = null;
        this.producer = null;
        this.consumer = null;
        this.is_connected = false;
        if (!kafkajs) {
            throw dependency_error;
        }
        this.topic_name = 'cqrs-events';
        this.consumer_group_id = options.consumer?.groupId || 'cqrs-consumer-group';
        this.initialization_promise = this.initialize();
    }
    async initialize() {
        try {
            if (!kafkajs) {
                throw dependency_error;
            }
            this.kafka_client = new kafkajs.Kafka({
                clientId: this.options.client?.clientId || 'cqrs-kafka-client',
                brokers: this.options.client?.brokers || ['localhost:9092'],
                ...this.options.client,
            });
            if (!this.kafka_client) {
                throw new Error('Failed to create Kafka client');
            }
            this.producer = this.kafka_client.producer({
                ...this.options.producer,
            });
            if (!this.options.producerOnlyMode) {
                this.consumer = this.kafka_client.consumer({
                    groupId: this.consumer_group_id,
                    ...this.options.consumer,
                });
            }
            await this.producer.connect();
            if (this.consumer) {
                await this.consumer.connect();
                await this.consumer.subscribe({
                    topics: [this.topic_name],
                    fromBeginning: this.options.subscribe?.fromBeginning || false,
                    ...this.options.subscribe,
                });
                await this.consumer.run({
                    autoCommit: true,
                    eachMessage: async ({ message }) => {
                        await this.process_incoming_message(message);
                    },
                    ...this.options.run,
                });
            }
            this.is_connected = true;
        }
        catch (error) {
            this.logger.error('Failed to initialize Kafka subject:', error);
            super.error(error);
            throw error;
        }
    }
    async process_incoming_message(message) {
        try {
            if (!message.value) {
                return;
            }
            const event_data = message.value.toString();
            const event = JSON.parse(event_data);
            super.next(event);
        }
        catch (error) {
            this.logger.error('Failed to parse Kafka message:', error);
            super.error(new Error(`Failed to parse Kafka message: ${error}`));
        }
    }
    next(value) {
        if (!this.is_connected) {
            this.initialization_promise
                .then(() => {
                this.publish_to_kafka(value);
            })
                .catch(error => {
                super.error(error);
            });
        }
        else {
            this.publish_to_kafka(value);
        }
    }
    async publish_to_kafka(value) {
        try {
            if (!this.producer) {
                throw new Error('Producer not initialized');
            }
            const message_data = JSON.stringify(value);
            await this.producer.send({
                topic: this.topic_name,
                messages: [
                    {
                        key: value.correlationId || value.type,
                        value: message_data,
                        headers: {
                            'event-type': value.type,
                            'correlation-id': value.correlationId || '',
                        },
                    },
                ],
                ...this.options.send,
            });
        }
        catch (error) {
            this.logger.error('Failed to publish message to Kafka:', error);
            super.error(new Error(`Failed to publish to Kafka: ${error}`));
        }
    }
    error(err) {
        const error_event = {
            type: 'system_error',
            payload: err instanceof Error ? err.message : err,
        };
        if (this.is_connected) {
            this.publish_to_kafka(error_event);
        }
        super.error(err);
    }
    complete() {
        this.disconnect().finally(() => {
            super.complete();
        });
    }
    async disconnect() {
        try {
            if (this.consumer) {
                await this.consumer.disconnect();
            }
            if (this.producer) {
                await this.producer.disconnect();
            }
        }
        catch (error) {
            this.logger.error('Error disconnecting from Kafka:', error);
        }
    }
    async wait_for_connection() {
        await this.initialization_promise;
    }
    get connected() {
        return this.is_connected;
    }
    get topic() {
        return this.topic_name;
    }
    async commit_offsets() {
        if (this.consumer) {
            await this.consumer.commitOffsets([]);
        }
    }
    pause() {
        if (this.consumer) {
            this.consumer.pause([{ topic: this.topic_name }]);
        }
    }
    resume() {
        if (this.consumer) {
            this.consumer.resume([{ topic: this.topic_name }]);
        }
    }
}
exports.KafkaSubject = KafkaSubject;
